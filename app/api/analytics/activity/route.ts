import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordSiteActivity } from "@/lib/analytics/tracker";
import { recordWatchTelemetry } from "@/lib/analytics/engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const {
      sessionId,
      type,
      device,
      mediaKey,
      mediaType,
      route,
      watchSeconds,
      totalDuration,
      completed,
      title,
      season,
      episode,
      providerId,
    } = body;

    if (!sessionId || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userId = (session?.user as { id?: string } | undefined)?.id || null;

    // 1. Process basic site activity
    await recordSiteActivity({
      sessionId,
      userId,
      type,
      device,
      mediaKey,
      mediaType,
      route,
    });

    // 2. If this is a playback/watch event with watch time, record dedicated watch telemetry
    if (type === "WATCH" && mediaKey) {
      await recordWatchTelemetry({
        sessionId,
        userId,
        mediaKey,
        mediaType: mediaType || "movie",
        title,
        season,
        episode,
        watchSeconds: typeof watchSeconds === "number" ? watchSeconds : 15,
        totalDuration,
        completed,
        device,
        providerId,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    // Non-blocking response
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

