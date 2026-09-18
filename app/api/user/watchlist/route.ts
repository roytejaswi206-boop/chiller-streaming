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

  const items = await prisma.watchlist.findMany({
    where: { userId: user.id },
    orderBy: { addedAt: "desc" },
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
    const { tmdbId, videoId, mediaType, title, posterUrl, backdropUrl, rating, releaseYear } = body;

    // Check if already in list
    const existing = await prisma.watchlist.findFirst({
      where: {
        userId: user.id,
        ...(tmdbId ? { tmdbId } : videoId ? { videoId } : {}),
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, item: existing });
    }

    const item = await prisma.watchlist.create({
      data: {
        userId: user.id,
        tmdbId: tmdbId ? parseInt(String(tmdbId), 10) : undefined,
        videoId: videoId || undefined,
        mediaType: mediaType || "movie",
        title: title || "Untitled",
        posterUrl,
        backdropUrl,
        rating: rating ? parseFloat(String(rating)) : undefined,
        releaseYear: releaseYear ? String(releaseYear) : undefined,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
    const { tmdbId, videoId } = body;

    await prisma.watchlist.deleteMany({
      where: {
        userId: user.id,
        ...(tmdbId ? { tmdbId: parseInt(String(tmdbId), 10) } : videoId ? { videoId } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
