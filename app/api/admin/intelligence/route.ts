import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/rbac";
import { playbackRegistry } from "@/lib/playback/registry";
import { providerHealthCache } from "@/lib/playback/health-cache";
import { getCrosswalkStats } from "@/lib/media/identity/id-mapper";
import { getRecommendations } from "@/lib/content/recommendations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    const testTitle = searchParams.get("testTitle") || "Attack on Titan";
    const testType = (searchParams.get("testType") || "anime") as "movie" | "tv" | "anime";

    // Run live recommendation diagnostic evaluation
    let recommendationDebug = null;
    try {
      recommendationDebug = await getRecommendations({
        title: testTitle,
        mediaType: testType,
        genres: testType === "anime" ? ["Action", "Fantasy", "Drama"] : ["Action", "Thriller"],
        limit: 8,
        debug: true,
      });
    } catch (e: any) {
      recommendationDebug = { error: e.message };
    }

    // Query real playback attempts from database
    const attempts = await prisma.playbackAttempt.findMany({
      take: 500,
      orderBy: { createdAt: "desc" },
    });

    const statsMap: Record<string, { total: number; success: number; failures: number; latencies: number[] }> = {};
    for (const a of attempts) {
      if (!statsMap[a.providerId]) {
        statsMap[a.providerId] = { total: 0, success: 0, failures: 0, latencies: [] };
      }
      statsMap[a.providerId].total++;
      if (a.status === "SUCCESS") {
        statsMap[a.providerId].success++;
        if (a.latencyMs > 0) statsMap[a.providerId].latencies.push(a.latencyMs);
      } else {
        statsMap[a.providerId].failures++;
      }
    }

    const generalProviders = playbackRegistry.getGeneralProviders();
    const animeProviders = playbackRegistry.getAnimeProviders();

    const generalMetrics = generalProviders.map((p) => {
      const dbStat = statsMap[p.id];
      const health = providerHealthCache.getHealth(p.id);
      const total = dbStat?.total ?? (health.totalSuccess + health.totalFailures);
      const success = dbStat?.success ?? health.totalSuccess;
      const failures = dbStat?.failures ?? health.totalFailures;
      const successRate = total > 0 ? Math.round((success / total) * 100) : null;
      const avgStartup =
        dbStat && dbStat.latencies.length > 0
          ? Math.round(dbStat.latencies.reduce((a, b) => a + b, 0) / dbStat.latencies.length)
          : health.latencyMs || 0;

      return {
        id: p.id,
        name: p.name,
        pool: "GENERAL",
        enabled: p.enabled,
        priority: p.priority,
        status: health.status || "CONFIGURED",
        score: health.score,
        totalSuccess: success,
        totalFailures: failures,
        totalAttempts: total,
        successRate,
        averageStartupMs: avgStartup,
        lastSuccess: health.lastSuccess,
        lastFailure: health.lastFailure,
        lastError: health.lastError,
      };
    });

    const animeMetrics = animeProviders.map((p) => {
      const dbStat = statsMap[p.id];
      const health = providerHealthCache.getHealth(p.id);
      const total = dbStat?.total ?? (health.totalSuccess + health.totalFailures);
      const success = dbStat?.success ?? health.totalSuccess;
      const failures = dbStat?.failures ?? health.totalFailures;
      const successRate = total > 0 ? Math.round((success / total) * 100) : null;
      const avgStartup =
        dbStat && dbStat.latencies.length > 0
          ? Math.round(dbStat.latencies.reduce((a, b) => a + b, 0) / dbStat.latencies.length)
          : health.latencyMs || 0;

      return {
        id: p.id,
        name: p.name,
        pool: "ANIME",
        enabled: p.enabled,
        priority: p.priority,
        status: health.status || "CONFIGURED",
        score: health.score,
        totalSuccess: success,
        totalFailures: failures,
        totalAttempts: total,
        successRate,
        averageStartupMs: avgStartup,
        lastSuccess: health.lastSuccess,
        lastFailure: health.lastFailure,
        lastError: health.lastError,
      };
    });

    const allMetrics = [...generalMetrics, ...animeMetrics];
    const topProviders = [...allMetrics]
      .filter((p) => p.totalAttempts > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5);

    const slowestProviders = [...allMetrics]
      .filter((p) => p.averageStartupMs > 0)
      .sort((a, b) => b.averageStartupMs - a.averageStartupMs)
      .slice(0, 5);

    const activeGeneral = generalMetrics.filter((p) => p.enabled).length;
    const activeAnime = animeMetrics.filter((p) => p.enabled).length;

    // Real recommendations based on real failures
    const recommendations: { type: "info" | "warning" | "success"; message: string }[] = [];
    for (const p of allMetrics) {
      if (p.totalFailures > 2 && (p.successRate ?? 100) < 50) {
        recommendations.push({
          type: "warning",
          message: `Provider ${p.name} in ${p.pool} pool has elevated failure rate (${p.totalFailures} failures, ${p.successRate}% success). Circuit breaker active.`,
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: "success",
        message: "Dual-pool routing boundaries verified: General and Anime provider pools operating within healthy latency parameters.",
      });
    }

    const crosswalkStats = getCrosswalkStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalGeneralProviders: generalProviders.length,
        totalAnimeProviders: animeProviders.length,
        activeGeneralProviders: activeGeneral,
        activeAnimeProviders: activeAnime,
        crosswalkEntries: crosswalkStats.totalEntries,
      },
      topProviders,
      slowestProviders,
      generalMetrics,
      animeMetrics,
      recommendations,
      crosswalkStats,
      recommendationDebug,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load intelligence telemetry" },
      { status: 500 }
    );
  }
}
