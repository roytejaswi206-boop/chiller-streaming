import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (!user) {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.watchHistory.findMany({
    where: { userId: user.id },
    orderBy: { lastWatchedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      tmdbId,
      anilistId,
      mediaKey: incomingMediaKey,
      videoId,
      mediaType,
      title,
      posterUrl,
      backdropUrl,
      season,
      episode,
      progressSeconds,
      currentTime,
      durationSeconds,
      duration,
    } = body;

    // Server-side progress & duration validation (Section 4)
    const rawProgress = Number(progressSeconds !== undefined ? progressSeconds : currentTime);
    const rawDuration = Number(durationSeconds !== undefined ? durationSeconds : duration);

    const validProgress =
      Number.isFinite(rawProgress) && rawProgress >= 0 && rawProgress <= 86400
        ? Math.floor(rawProgress)
        : undefined;

    const validDuration =
      Number.isFinite(rawDuration) && rawDuration > 0 && rawDuration <= 86400
        ? Math.floor(rawDuration)
        : undefined;

    // Calculate completion server-side: >= 95% is treated as completed (Section 4 & 15)
    const isCompleted =
      validProgress !== undefined && validDuration !== undefined && validDuration > 0
        ? validProgress / validDuration >= 0.95
        : false;

    const parsedAnilistId = anilistId ? parseInt(String(anilistId), 10) : undefined;
    const parsedTmdbId = tmdbId ? parseInt(String(tmdbId), 10) : undefined;

    // Compute canonical mediaKey for exact matching without cross-contamination
    const computedMediaKey =
      incomingMediaKey ||
      (parsedAnilistId
        ? `anilist:${parsedAnilistId}${episode ? `:ep${episode}` : ""}`
        : parsedTmdbId
        ? `tmdb:${mediaType || "movie"}:${parsedTmdbId}${season && episode ? `:s${season}e${episode}` : ""}`
        : videoId
        ? `video:${videoId}`
        : undefined);

    // Upsert or update existing history record
    const existing = await prisma.watchHistory.findFirst({
      where: {
        userId: user.id,
        ...(computedMediaKey
          ? { mediaKey: computedMediaKey }
          : parsedAnilistId
          ? { anilistId: parsedAnilistId }
          : parsedTmdbId
          ? { tmdbId: parsedTmdbId }
          : videoId
          ? { videoId }
          : { id: "impossible_nonexistent_id" }), // Guard against matching random record if no ID is passed
      },
    });

    if (existing) {
      await prisma.watchHistory.update({
        where: { id: existing.id },
        data: {
          seasonNumber: season !== undefined ? season : existing.seasonNumber,
          episodeNumber: episode !== undefined ? episode : existing.episodeNumber,
          progressSeconds: validProgress !== undefined ? validProgress : existing.progressSeconds,
          durationSeconds: validDuration !== undefined ? validDuration : existing.durationSeconds,
          completed: isCompleted !== undefined ? isCompleted : existing.completed,
          posterUrl: posterUrl || existing.posterUrl,
          backdropUrl: backdropUrl || existing.backdropUrl,
          mediaKey: computedMediaKey || existing.mediaKey,
          lastWatchedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, completed: isCompleted });
    }

    await prisma.watchHistory.create({
      data: {
        userId: user.id,
        tmdbId: parsedTmdbId,
        anilistId: parsedAnilistId,
        mediaKey: computedMediaKey,
        videoId: videoId || undefined,
        mediaType: mediaType || (parsedAnilistId ? "anime" : "movie"),
        title: title || "Untitled",
        posterUrl,
        backdropUrl,
        seasonNumber: season,
        episodeNumber: episode,
        progressSeconds: validProgress || 0,
        durationSeconds: validDuration || 0,
        completed: isCompleted,
        lastWatchedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, completed: isCompleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

