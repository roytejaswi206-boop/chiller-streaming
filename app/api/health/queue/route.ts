import { NextResponse } from "next/server";
import { VideoJobQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = await VideoJobQueue.getMetrics();
    return NextResponse.json({
      status: "UP",
      mode: metrics.mode,
      metrics: {
        queued: metrics.queued,
        processing: metrics.processing,
        ready: metrics.ready,
        failed: metrics.failed,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ status: "DOWN", error: err.message }, { status: 500 });
  }
}
