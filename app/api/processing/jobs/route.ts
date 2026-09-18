import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProcessingQueue } from "@/lib/processing-queue";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await prisma.processingJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { video: true },
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  try {
    const { action, jobId } = await req.json();

    if (action === "RETRY" && jobId) {
      const success = await ProcessingQueue.retry(jobId);
      return NextResponse.json({ success });
    }

    if (action === "CANCEL" && jobId) {
      const success = await ProcessingQueue.cancel(jobId);
      return NextResponse.json({ success });
    }

    if (action === "RETRY_ALL_FAILED") {
      const failed = await prisma.processingJob.findMany({
        where: { status: "FAILED" },
      });
      for (const j of failed) {
        await ProcessingQueue.retry(j.id);
      }
      return NextResponse.json({ retried: failed.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
