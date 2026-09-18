import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeWithBigInt } from "@/lib/json-serializer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const jobs = await prisma.telegramImportJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        source: {
          select: {
            title: true,
            telegramId: true,
            type: true,
          },
        },
      },
    });

    // Also get global totals
    const [totalDiscovered, totalImported, totalDuplicates, totalFailed] = await Promise.all([
      prisma.telegramMedia.count(),
      prisma.telegramMedia.count({ where: { status: "READY" } }),
      prisma.telegramMedia.count({ where: { status: "DUPLICATE" } }),
      prisma.telegramMedia.count({ where: { status: "FAILED" } }),
    ]);

    return NextResponse.json({
      jobs: serializeWithBigInt(jobs),
      metrics: {
        totalDiscovered,
        totalImported,
        totalDuplicates,
        totalFailed,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
