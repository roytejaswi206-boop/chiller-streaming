import { NextResponse } from "next/server";
import { playbackRegistry } from "@/lib/playback/registry";
import { getProviderDirectoryEntry } from "@/lib/playback/provider-directory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const healthStats = playbackRegistry.getHealthStats();

    const providers = playbackRegistry.getAllProviders().map((p) => {
      const dir = getProviderDirectoryEntry(p.id);
      const caps = p.getCapabilities();
      const health = healthStats[p.id] || p.getHealth();

      // Determine setup status
      let setupStatus: string = "CONFIGURED";
      if (!p.enabled) {
        setupStatus = "DISABLED";
      } else if (p.requiresApiKey && !process.env[`${p.id.toUpperCase()}_API_KEY`] && !process.env[`${p.id.toUpperCase()}_API_TOKEN`]) {
        setupStatus = "NOT_CONFIGURED";
      } else if (health.status === "ACTIVE" || health.status === "CONFIGURED") {
        setupStatus = "HEALTHY";
      } else if (health.status === "DEGRADED") {
        setupStatus = "DEGRADED";
      } else if (health.status === "FAILED") {
        setupStatus = "AUTH_ERROR";
      }

      return {
        id: p.id,
        name: p.name,
        enabled: p.enabled,
        priority: p.priority,
        category: dir?.category || "VIDEO_HOST",
        integrationType: dir?.integrationType || "IFRAME_EMBED",
        authType: dir?.authType || "NONE",
        referenceUrl: dir?.referenceUrl || "",
        docsUrl: dir?.docsUrl || "",
        envFlag: dir?.envFlag || `${p.id.toUpperCase()}_ENABLED`,
        setupStatus,
        capabilities: {
          supportsMovie: caps.supportsMovie,
          supportsTV: caps.supportsTV,
          supportsAnime: caps.supportsAnime,
          supportsSub: caps.supportsSub,
          supportsDub: caps.supportsDub,
          supportsEvents: caps.supportsEvents,
          hasCaptions: caps.hasCaptions,
          requiresApiKey: caps.requiresApiKey,
        },
        health: {
          status: health.status,
          latencyMs: health.latencyMs || 0,
          totalSuccess: health.totalSuccess,
          totalFailures: health.totalFailures,
          lastSuccess: health.lastSuccess,
          lastFailure: health.lastFailure,
          lastError: health.lastError,
          score: health.score,
        },
      };
    });

    return NextResponse.json({
      success: true,
      providers,
      healthStats,
      count: providers.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load providers" },
      { status: 500 }
    );
  }
}
