import { NextRequest, NextResponse } from "next/server";
import { playbackRegistry } from "@/lib/playback/registry";
import { resolveCandidatesConcurrently } from "@/lib/playback/orchestrator";
import { PlaybackRequest } from "@/lib/playback/types";
import { getActiveMappedSources } from "@/lib/playback/source-mapper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaType = (searchParams.get("type") || "movie") as "movie" | "tv" | "anime";
    const tmdbId = searchParams.get("id") || (mediaType === "tv" ? "1399" : "550");
    const anilistId = searchParams.get("anilistId") || (mediaType === "anime" ? "16498" : undefined);
    const season = parseInt(searchParams.get("s") || "1", 10);
    const episode = parseInt(searchParams.get("e") || "1", 10);
    const targetProviderId = searchParams.get("provider")?.trim().toLowerCase();
    const mode = searchParams.get("mode") || "all"; // "all" | "single" | "auto"

    const testRequest: PlaybackRequest = {
      mediaType,
      tmdbId,
      anilistId: anilistId ? parseInt(anilistId, 10) : undefined,
      season,
      episode,
      language: "sub",
    };

    // If AUTO mode requested, run orchestrator concurrent resolution
    if (mode === "auto") {
      const start = Date.now();
      const resolution = await resolveCandidatesConcurrently(testRequest);
      const latencyMs = Date.now() - start;

      return NextResponse.json({
        success: true,
        mode: "auto",
        testTarget: { mediaType, tmdbId, anilistId, season, episode },
        primaryCandidate: resolution.primaryCandidate,
        totalCandidates: resolution.candidates.length,
        candidates: resolution.candidates,
        latencyMs,
      });
    }

    // Otherwise test providers individually
    const mappedSources = await getActiveMappedSources(testRequest).catch(() => []);
    const providersToTest = targetProviderId
      ? [playbackRegistry.getProvider(targetProviderId)].filter(Boolean)
      : playbackRegistry.getAllProviders();

    const results = await Promise.all(
      providersToTest.map(async (provider: any) => {
        const start = Date.now();
        let configStatus = provider.enabled ? "OK" : "DISABLED";
        if (provider.requiresApiKey && !process.env[`${provider.id.toUpperCase()}_API_KEY`] && !process.env[`${provider.id.toUpperCase()}_API_TOKEN`]) {
          configStatus = "NOT CONFIGURED";
        }

        // Check if there is a match in mapped sources or supported
        const hasMappedMatch = mappedSources.some((m) => m.providerId.toLowerCase() === provider.id.toLowerCase());
        const matchStatus = hasMappedMatch ? "MAPPED" : provider.supports(testRequest) ? "SUPPORTED" : "UNSUPPORTED";

        let resolutionStatus = "FAILED";
        let candidateUrl: string | undefined;
        let modeType: "HLS" | "EMBED" | "MP4" = "EMBED";
        let latencyMs = 0;
        let errorMsg: string | undefined;

        if (provider.enabled && provider.supports(testRequest)) {
          try {
            const resStart = Date.now();
            const candidate = await provider.resolve(testRequest);
            latencyMs = Date.now() - resStart;

            if (candidate && candidate.url) {
              resolutionStatus = "FOUND";
              candidateUrl = candidate.url;
              modeType = candidate.type === "hls" ? "HLS" : candidate.type === "mp4" ? "MP4" : "EMBED";
            } else {
              errorMsg = hasMappedMatch ? "Mapped ID failed resolution" : "No stream returned";
            }
          } catch (err: any) {
            latencyMs = Date.now() - start;
            errorMsg = err.message || "Resolution error";
          }
        }

        const totalMs = Date.now() - start;

        return {
          providerId: provider.id,
          providerName: provider.name,
          priority: provider.priority,
          enabled: provider.enabled,
          configuration: configStatus,
          match: matchStatus,
          resolution: resolutionStatus,
          latencyMs,
          totalMs,
          playerMode: modeType,
          candidateUrl,
          player: resolutionStatus === "FOUND" ? "READY" : "NOT READY",
          playback: resolutionStatus === "FOUND" ? "READY_TO_TEST" : "UNAVAILABLE",
          error: errorMsg,
        };
      })
    );

    return NextResponse.json({
      success: true,
      mode,
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
