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
    const { tmdbId, videoId, mediaType, title, posterUrl, season, episode } = body;

    // Upsert or update existing history record
    const existing = await prisma.watchHistory.findFirst({
      where: {
        userId: user.id,
        ...(tmdbId ? { tmdbId } : videoId ? { videoId } : {}),
      },
    });

    if (existing) {
      await prisma.watchHistory.update({
        where: { id: existing.id },
        data: {
          seasonNumber: season || existing.seasonNumber,
          episodeNumber: episode || existing.episodeNumber,
          lastWatchedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true });
    }

    await prisma.watchHistory.create({
      data: {
        userId: user.id,
        tmdbId: tmdbId ? parseInt(String(tmdbId), 10) : undefined,
        videoId: videoId || undefined,
        mediaType: mediaType || "movie",
        title: title || "Untitled",
        posterUrl,
        seasonNumber: season,
        episodeNumber: episode,
        lastWatchedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
