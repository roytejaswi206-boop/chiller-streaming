import { NextRequest, NextResponse } from "next/server";
import { playbackRegistry } from "@/lib/playback/registry";
import { PlaybackRequest } from "@/lib/playback/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaType = (searchParams.get("type") || "movie") as "movie" | "tv" | "anime";
    const tmdbId = searchParams.get("id") || (mediaType === "tv" ? "1399" : "550");
    const anilistId = searchParams.get("anilistId") || (mediaType === "anime" ? "16498" : undefined);
    const season = parseInt(searchParams.get("s") || "1", 10);
    const episode = parseInt(searchParams.get("e") || "1", 10);

    const testRequest: PlaybackRequest = {
      mediaType,
      tmdbId,
      anilistId: anilistId ? parseInt(anilistId, 10) : undefined,
      season,
      episode,
      language: "sub",
    };

    const providers = playbackRegistry.getEnabledProviders();

    // Run tests in parallel across all enabled providers
    const testPromises = providers.map(async (provider) => {
      const start = Date.now();
      let connectionStatus = "FAIL";
      let resolutionStatus = "FAIL";
      let candidateUrl: string | undefined;
      let latencyMs = 0;
      let errorMsg: string | undefined;

      try {
        // 1. Connection check
        const health = await provider.healthCheck();
        connectionStatus = health.status === "FAILED" ? "FAIL" : "PASS";

        // 2. Resolution check
        const resStart = Date.now();
        const candidate = await provider.resolve(testRequest);
        latencyMs = Date.now() - resStart;

        if (candidate && candidate.url) {
          resolutionStatus = "PASS";
          candidateUrl = candidate.url;
        } else {
          resolutionStatus = "FAIL";
          errorMsg = "No candidate returned for test target";
        }
      } catch (err: any) {
        errorMsg = err.message || "Execution error";
      }

      const totalMs = Date.now() - start;

      return {
        providerId: provider.id,
        providerName: provider.name,
        priority: provider.priority,
        enabled: provider.enabled,
        connection: connectionStatus,
        resolution: resolutionStatus,
        candidateUrl,
        latencyMs,
        totalMs,
        error: errorMsg,
        status: resolutionStatus === "PASS" ? "READY" : connectionStatus === "PASS" ? "PARTIAL" : "FAIL",
      };
    });

    const results = await Promise.all(testPromises);

    return NextResponse.json({
      success: true,
      testTarget: { mediaType, tmdbId, anilistId, season, episode },
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute diagnostic tests" },
      { status: 500 }
    );
  }
}
