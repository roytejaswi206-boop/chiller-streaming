import { NextRequest, NextResponse } from "next/server";
import { playbackRegistry } from "@/lib/playback/registry";
import { providerHealthCache } from "@/lib/playback/health-cache";
import { getCrosswalkStats } from "@/lib/media/identity/id-mapper";
import { getRecommendations } from "@/lib/content/recommendations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

    const generalProviders = playbackRegistry.getGeneralProviders();
    const animeProviders = playbackRegistry.getAnimeProviders();

    const generalMetrics = generalProviders.map((p) => {
      const health = providerHealthCache.getHealth(p.id);
      const total = health.totalSuccess + health.totalFailures;
      const successRate = total > 0 ? Math.round((health.totalSuccess / total) * 100) : 100;
      return {
        id: p.id,
        name: p.name,
        pool: "GENERAL",
        enabled: p.enabled,
        priority: p.priority,
        status: health.status,
        score: health.score,
        totalSuccess: health.totalSuccess,
        totalFailures: health.totalFailures,
        successRate,
        averageStartupMs: health.averageStartupMs,
        lastSuccess: health.lastSuccess,
        lastFailure: health.lastFailure,
        lastError: health.lastError,
      };
    });

    const animeMetrics = animeProviders.map((p) => {
      const health = providerHealthCache.getHealth(p.id);
      const total = health.totalSuccess + health.totalFailures;
      const successRate = total > 0 ? Math.round((health.totalSuccess / total) * 100) : 100;
      return {
        id: p.id,
        name: p.name,
        pool: "ANIME",
        enabled: p.enabled,
        priority: p.priority,
        status: health.status,
        score: health.score,
        totalSuccess: health.totalSuccess,
        totalFailures: health.totalFailures,
        successRate,
        averageStartupMs: health.averageStartupMs,
        lastSuccess: health.lastSuccess,
        lastFailure: health.lastFailure,
        lastError: health.lastError,
      };
    });

    const allMetrics = [...generalMetrics, ...animeMetrics];
    const topProviders = [...allMetrics].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
    const slowestProviders = [...allMetrics]
      .filter((p) => (p.averageStartupMs ?? 0) > 0)
      .sort((a, b) => (b.averageStartupMs ?? 0) - (a.averageStartupMs ?? 0))
      .slice(0, 5);

    // Compute automatic routing recommendations
    const recommendations: { type: "info" | "warning" | "success"; message: string }[] = [];

    for (const p of animeMetrics) {
      if (p.totalFailures > 2 && p.successRate < 50) {
        recommendations.push({
          type: "warning",
          message: `Provider ${p.name} is degrading for Anime (${p.totalFailures} failures, ${p.successRate}% success rate). Auto-failover is engaged.`,
        });
      }
    }

    for (const p of generalMetrics) {
      if (p.totalFailures > 3 && p.successRate < 40) {
        recommendations.push({
          type: "warning",
          message: `General provider ${p.name} has elevated failures. Dynamic routing demoted priority.`,
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: "success",
        message: "Dual-pool routing operating in nominal healthy state. General and Anime pools fully isolated.",
      });
      recommendations.push({
        type: "info",
        message: "Dynamic scoring algorithm auto-promoting fast responsive providers based on real latency and success telemetry.",
      });
    }

    const crosswalkStats = getCrosswalkStats();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalGeneralProviders: generalProviders.length,
        totalAnimeProviders: animeProviders.length,
        activeGeneralProviders: generalMetrics.filter((p) => p.enabled && p.status === "ACTIVE").length,
        activeAnimeProviders: animeMetrics.filter((p) => p.enabled && p.status === "ACTIVE").length,
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
