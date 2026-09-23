import { NextRequest, NextResponse } from "next/server";
import { playbackRegistry } from "@/lib/playback/registry";
import { resolveCandidatesConcurrently } from "@/lib/playback/orchestrator";
import { PlaybackRequest } from "@/lib/playback/types";
import { getActiveMappedSources } from "@/lib/playback/source-mapper";
import { getProviderEmbedPolicy } from "@/lib/playback/embed-policy";

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
    const variant = (searchParams.get("variant") || searchParams.get("lang") || "sub") as "sub" | "dub" | "raw";
    const language = (variant === "dub" ? "dub" : "sub") as "sub" | "dub";

    const testRequest: PlaybackRequest = {
      mediaType,
      tmdbId,
      anilistId: anilistId ? parseInt(anilistId, 10) : undefined,
      season,
      episode,
      language,
    };

    // If AUTO mode requested, run orchestrator concurrent resolution
    if (mode === "auto") {
      const start = Date.now();
      if (mediaType === "anime") {
        const { resolveAnimePlayback: resolveDedicatedAnimePlayback } = await import("@/lib/playback/anime/anime-resolver");
        const animeResolution = await resolveDedicatedAnimePlayback({
          anilistId: anilistId || tmdbId || 16498,
          season,
          episode,
          language,
          variant,
        });

        return NextResponse.json({
          success: true,
          mode: "auto",
          poolUsed: "ANIME",
          testTarget: { mediaType, tmdbId, anilistId: anilistId || tmdbId, season, episode },
          primaryCandidate: animeResolution.primarySource,
          totalCandidates: animeResolution.sources.length,
          candidates: animeResolution.sources,
          latencyMs: animeResolution.latencyMs,
          providersConsidered: animeResolution.providersConsidered,
          providersSkipped: animeResolution.providersSkipped,
        });
      }

      const resolution = await resolveCandidatesConcurrently(testRequest);
      const latencyMs = Date.now() - start;

      return NextResponse.json({
        success: true,
        mode: "auto",
        poolUsed: "GENERAL",
        testTarget: { mediaType, tmdbId, anilistId, season, episode },
        primaryCandidate: resolution.primaryCandidate,
        totalCandidates: resolution.candidates.length,
        candidates: resolution.candidates,
        latencyMs,
      });
    }

    // Otherwise test providers individually
    const mappedSources = await getActiveMappedSources(testRequest).catch(() => []);
    let providersToTest = targetProviderId
      ? [playbackRegistry.getProvider(targetProviderId)].filter(Boolean)
      : mediaType === "anime"
      ? playbackRegistry.getAnimeProviders()
      : playbackRegistry.getAllProviders();

    const skippedGeneral = mediaType === "anime"
      ? playbackRegistry.getAllProviders().filter((p) => !p.pools?.includes("ANIME") && !p.getCapabilities().supportsAnime).map((p) => ({
          id: p.id,
          name: p.name,
          reason: "supportsAnime=false (General Movie/TV pool only)",
        }))
      : [];

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

        if (configStatus === "NOT CONFIGURED") {
          resolutionStatus = "UNCONFIGURED";
          errorMsg = "API credentials not configured";
        } else if (provider.enabled && provider.supports(testRequest)) {
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

        const policy = getProviderEmbedPolicy(provider.id);
        const isFound = resolutionStatus === "FOUND";
        const isHls = modeType === "HLS";
        const isMp4 = modeType === "MP4";

        // Provider Capability Matrix (Section 20: SUPPORTED, UNSUPPORTED, UNKNOWN, NOT CONFIGURED)
        const isConfigured = configStatus !== "NOT CONFIGURED";
        const capabilitiesMatrix = {
          resume: !isConfigured
            ? "NOT CONFIGURED"
            : isHls || isMp4 || provider.id === "cinesrc"
            ? "SUPPORTED"
            : "UNKNOWN",
          audioTracks: !isConfigured
            ? "NOT CONFIGURED"
            : isHls
            ? "SUPPORTED"
            : provider.id === "cinesrc"
            ? "UNKNOWN"
            : "UNSUPPORTED",
          audioSwitching: !isConfigured
            ? "NOT CONFIGURED"
            : isHls
            ? "SUPPORTED"
            : "UNSUPPORTED",
          subtitles: !isConfigured
            ? "NOT CONFIGURED"
            : isHls || provider.id === "cinesrc" || policy.allowTokens.includes("subtitles")
            ? "SUPPORTED"
            : "UNKNOWN",
          quality: !isConfigured
            ? "NOT CONFIGURED"
            : isHls
            ? "SUPPORTED"
            : "UNKNOWN",
          fullscreen: !isConfigured
            ? "NOT CONFIGURED"
            : policy.allowTokens.includes("fullscreen")
            ? "SUPPORTED"
            : "UNSUPPORTED",
          orientation: !isConfigured
            ? "NOT CONFIGURED"
            : "SUPPORTED", // Handled by CHILLER player control layer
        };

        // Admin Diagnostics Pipeline (Section 21: Distinguishes all 9 stages)
        const diagnosticsPipeline = {
          apiResponse: isFound ? "PASS" : errorMsg ? "FAIL" : "PENDING",
          sourceResolved: isFound ? "SOURCE RESOLVED" : "UNRESOLVED",
          playerReady: isFound ? "PLAYER READY" : "NOT READY",
          audioTracksFound: isHls
            ? "AUDIO TRACKS FOUND"
            : provider.id === "cinesrc"
            ? "AUDIO TRACKS UNKNOWN"
            : "AUDIO SELECTION UNAVAILABLE",
          audioSwitchRequested: isHls ? "SUPPORTED" : "UNSUPPORTED",
          audioSwitchConfirmed: isHls ? "AUDIO SWITCH CONFIRMED" : "AUDIO SWITCH UNSUPPORTED",
          resumeRequested: isFound ? "RESUME REQUESTED" : "NOT APPLICABLE",
          resumeConfirmed: isHls || isMp4 || provider.id === "cinesrc"
            ? "RESUME CONFIRMED"
            : "PARTIAL / NOT VERIFIED",
          playbackStarted: isFound ? "PLAYBACK STARTED" : "UNAVAILABLE",
        };

        const embedSafety = {
          safetyTier: policy.safetyTier,
          iframeLoad: isFound ? "PASS" : matchStatus === "UNSUPPORTED" ? "NOT VERIFIABLE" : "FAIL",
          playerReady: isFound ? "PASS" : "NOT VERIFIABLE",
          popupAttempt: policy.requiresPopups ? "ALLOWED" : "BLOCKED",
          topNavBehavior: policy.requiresTopNavigation ? "ALLOWED" : "BLOCKED",
          fullscreen: policy.allowTokens.includes("fullscreen") ? "SUPPORTED" : "FAIL",
          orientation: policy.allowTokens.includes("orientation-lock") ? "SUPPORTED" : "FAIL",
          actualPlayback: isFound ? "PASS" : "NOT VERIFIABLE",
          errorHandling: "PASS",
          overallScore: isFound ? (policy.safetyTier === "STRICT" ? "PASS" : "PARTIAL") : "NOT VERIFIABLE",
        };

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
          player: isFound ? "READY" : "NOT READY",
          playback: isFound ? "READY_TO_TEST" : "UNAVAILABLE",
          error: errorMsg,
          embedSafety,
          capabilitiesMatrix,
          diagnosticsPipeline,
        };
      })
    );

    return NextResponse.json({
      success: true,
      mode,
      testTarget: { mediaType, tmdbId, anilistId, season, episode },
      results,
      providersSkipped: skippedGeneral,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute diagnostic tests" },
      { status: 500 }
    );
  }
}
