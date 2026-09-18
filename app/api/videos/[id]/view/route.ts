import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { watchDuration = 0, quality = "Auto", sessionId } = body;

    const session = await getAuthSession();
    const userId = session?.user ? (session.user as any).id : null;

    // 1. Resolve video in database
    const video = await prisma.video.findFirst({
      where: {
        OR: [{ id }, { slug: id }, { publicId: id }],
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // 2. Strict View Qualification Rule:
    // Must watch at least 10 seconds OR 25% of video duration if shorter
    const thresholdSec = Math.min(10, Math.max(3, Math.round(video.duration * 0.25)));
    if (watchDuration < thresholdSec) {
      return NextResponse.json({
        counted: false,
        reason: `Watch duration (${watchDuration}s) below view qualification threshold (${thresholdSec}s)`,
      });
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    // 3. Deduplication: Check if this user or IP has already counted a view in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existingRecentView = await prisma.viewEvent.findFirst({
      where: {
        videoId: video.id,
        createdAt: { gte: thirtyMinutesAgo },
        OR: [
          ...(userId ? [{ userId }] : []),
          { ipAddress },
        ],
      },
    });

    const isNewUniqueView = !existingRecentView;

    // Record verified ViewEvent in database
    await prisma.viewEvent.create({
      data: {
        videoId: video.id,
        userId,
        ipAddress,
        userAgent,
        watchDuration: Math.round(watchDuration),
        quality,
      },
    });

    // Increment view counts only if not duplicated within session window
    let currentViews = video.views;
    if (isNewUniqueView) {
      const updated = await prisma.video.update({
        where: { id: video.id },
        data: {
          views: { increment: 1 },
          totalWatchTime: { increment: BigInt(Math.round(watchDuration)) },
          ...(userId ? { memberViews: { increment: 1 } } : { guestViews: { increment: 1 } }),
        },
        select: { views: true },
      });
      currentViews = updated.views;
    } else {
      // Just accumulate watch time
      await prisma.video.update({
        where: { id: video.id },
        data: {
          totalWatchTime: { increment: BigInt(Math.round(watchDuration)) },
        },
      });
    }

    // If authenticated, update watch history record with real video.id
    if (userId) {
      const existing = await prisma.watchHistory.findFirst({
        where: { userId, videoId: video.id },
      });
      if (existing) {
        await prisma.watchHistory.update({
          where: { id: existing.id },
          data: {
            progressSeconds: Math.round(watchDuration),
            lastWatchedAt: new Date(),
          },
        });
      } else {
        await prisma.watchHistory.create({
          data: {
            userId,
            videoId: video.id,
            progressSeconds: Math.round(watchDuration),
            lastWatchedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      counted: isNewUniqueView,
      isRepeatSession: !isNewUniqueView,
      totalViews: currentViews,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
