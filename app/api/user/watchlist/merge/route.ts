import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const items: any[] = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    let mergedCount = 0;

    for (const item of items) {
      const tmdbId = item.tmdbId ? parseInt(String(item.tmdbId), 10) : undefined;
      const videoId = item.videoId || undefined;
      const mediaType = item.mediaType || "movie";
      const mediaKey = tmdbId
        ? `tmdb:${mediaType}:${tmdbId}`
        : videoId
        ? `video:${videoId}`
        : item.id
        ? `item:${item.id}`
        : undefined;

      if (!mediaKey && !tmdbId && !videoId) continue;

      // Check existence to prevent duplicate inserts
      const existing = await prisma.watchlist.findFirst({
        where: {
          userId: user.id,
          OR: [
            ...(mediaKey ? [{ mediaKey }] : []),
            ...(tmdbId ? [{ tmdbId }] : []),
            ...(videoId ? [{ videoId }] : []),
          ],
        },
      });

      if (!existing) {
        await prisma.watchlist.create({
          data: {
            userId: user.id,
            tmdbId,
            videoId,
            mediaKey,
            mediaType,
            title: item.title || "Untitled",
            posterUrl: item.posterUrl || item.poster || item.posterPath || null,
            backdropUrl: item.backdropUrl || item.backdrop || item.backdropPath || null,
            rating: item.rating ? parseFloat(String(item.rating)) : undefined,
            releaseYear: item.releaseYear ? String(item.releaseYear) : undefined,
          },
        });
        mergedCount++;
      }
    }

    return NextResponse.json({ success: true, count: mergedCount });
  } catch (err: any) {
    console.error("Watchlist merge error:", err);
    return NextResponse.json({ error: err.message || "Failed to merge watchlist" }, { status: 500 });
  }
}
