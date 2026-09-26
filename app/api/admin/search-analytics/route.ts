import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/rbac";
import { prisma } from "@/lib/prisma";
import { computeAnalyticsDateRange, calculateComparison } from "@/lib/analytics/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "today";

    const dates = computeAnalyticsDateRange(range);

    const [currentEvents, prevCount] = await Promise.all([
      prisma.searchEvent.findMany({
        where: { createdAt: { gte: dates.startDate, lte: dates.endDate } },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.searchEvent.count({
        where: { createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
      }),
    ]);

    const totalSearches = currentEvents.length;
    const zeroResultEvents = currentEvents.filter((s) => s.resultCount === 0);

    // Group queries for frequency
    const queryCounts: Record<string, { count: number; resultCount: number; lastSearched: Date }> = {};
    for (const e of currentEvents) {
      const q = e.query.trim().toLowerCase();
      if (!queryCounts[q]) {
        queryCounts[q] = { count: 0, resultCount: e.resultCount, lastSearched: e.createdAt };
      }
      queryCounts[q].count++;
      if (e.createdAt > queryCounts[q].lastSearched) {
        queryCounts[q].lastSearched = e.createdAt;
      }
    }

    const topSearches = Object.entries(queryCounts)
      .map(([query, data]) => ({ query, count: data.count, resultCount: data.resultCount, lastSearched: data.lastSearched }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Zero result queries
    const zeroQueryCounts: Record<string, number> = {};
    for (const z of zeroResultEvents) {
      const q = z.query.trim().toLowerCase();
      zeroQueryCounts[q] = (zeroQueryCounts[q] || 0) + 1;
    }

    const zeroResultQueries = Object.entries(zeroQueryCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const comparison = calculateComparison(totalSearches, prevCount);

    return NextResponse.json({
      success: true,
      range,
      totalSearches,
      zeroResultCount: zeroResultEvents.length,
      comparison,
      topSearches,
      zeroResultQueries,
      recentSearches: currentEvents.slice(0, 20).map((s) => ({
        id: s.id,
        query: s.query,
        resultCount: s.resultCount,
        category: s.category,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load search analytics" },
      { status: 500 }
    );
  }
}
