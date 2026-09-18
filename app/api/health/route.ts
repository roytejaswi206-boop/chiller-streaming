import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultStorage } from "@/lib/storage";
import { VideoJobQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbHealthy = false;
  let dbLatencyMs = 0;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbHealthy = true;
  } catch {
    dbHealthy = false;
  }

  const storageHealthy = defaultStorage ? true : false;
  const queueMetrics = await VideoJobQueue.getMetrics();
  const origins = await prisma.streamingServer.findMany({
    select: { name: true, region: true, isHealthy: true, status: true, latencyMs: true },
  });

  const overallHealthy = dbHealthy && storageHealthy;

  return NextResponse.json(
    {
      status: overallHealthy ? "HEALTHY" : "DEGRADED",
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealthy ? "UP" : "DOWN",
          latencyMs: dbLatencyMs,
          type: process.env.DATABASE_URL?.includes("postgres") ? "PostgreSQL" : "SQLite-WAL",
        },
        storage: {
          status: storageHealthy ? "UP" : "DOWN",
          provider: process.env.STORAGE_PROVIDER || "local",
          path: process.env.LOCAL_STORAGE_PATH || "./media_storage",
        },
        queue: {
          status: "UP",
          type: queueMetrics.mode,
          backlog: queueMetrics.queued,
          active: queueMetrics.processing,
        },
        origins,
      },
    },
    { status: overallHealthy ? 200 : 503 }
  );
}
