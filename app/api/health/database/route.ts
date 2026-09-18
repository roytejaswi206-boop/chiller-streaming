import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    const [userCount, videoCount] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
    ]);

    return NextResponse.json({
      status: "UP",
      latencyMs,
      type: process.env.DATABASE_URL?.includes("postgres") ? "PostgreSQL" : "SQLite-WAL",
      records: { users: userCount, videos: videoCount },
    });
  } catch (err: any) {
    return NextResponse.json({ status: "DOWN", error: err.message }, { status: 500 });
  }
}
