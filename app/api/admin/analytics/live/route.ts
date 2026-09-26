import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/rbac";
import { getLiveActivityFeed } from "@/lib/analytics/engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [events, activeVisitorsNow, activeWatchesNow] = await Promise.all([
      getLiveActivityFeed(limit),
      prisma.siteActivity.groupBy({
        by: ["sessionId"],
        where: { updatedAt: { gte: fiveMinAgo } },
      }),
      prisma.watchSession.groupBy({
        by: ["sessionId"],
        where: { updatedAt: { gte: fiveMinAgo } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      activeVisitors: activeVisitorsNow.length,
      activeWatches: activeWatchesNow.length,
      events,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load live feed" },
      { status: 500 }
    );
  }
}
