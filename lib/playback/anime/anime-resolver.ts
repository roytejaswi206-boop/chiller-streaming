/**
 * lib/playback/anime/anime-resolver.ts
 *
 * CHILLER DEDICATED ANIME PLAYBACK RESOLVER
 *
 * Exclusively executes for media classified as ANIME or ANIME_MOVIE.
 * - Strict isolation: Only queries ANIME_PLAYBACK_POOL (zero general provider leakage).
 * - Independent anime provider priority and health tracking.
 * - Fast concurrent resolution with short bounded timeout.
 * - Returns normalized PlaybackSource list + diagnostic skipped provider telemetry.
 */

import {
  AnimePlaybackRequest,
  AnimePlaybackVariant,
  PlaybackCandidate,
  PlaybackSource,
  ProviderHealthStatus,
} from "../types";
import { playbackRegistry } from "../registry";
import { providerHealthCache } from "../health-cache";
import { providerResultCache } from "../cache";

const ANIME_RESOLVE_TIMEOUT_MS = parseInt(
  process.env.ANIME_RESOLVE_TIMEOUT_MS || "3500",
  10
);

export interface AnimeResolutionResult {
  sources: PlaybackSource[];
  primarySource: PlaybackSource | null;
  latencyMs: number;
  poolUsed: "ANIME";
  variantRequested: AnimePlaybackVariant;
  availableVariants: {
    sub: boolean;
    dub: boolean;
    raw: boolean;
  };
  providersConsidered: { id: string; name: string; priority: number }[];
  providersSkipped: { id: string; name: string; reason: string }[];
  failureReason?: string;
}

/**
 * Resolves a single anime provider with timeout and in-flight deduplication.
 */
async function resolveSingleAnimeProvider(
  providerId: string,
  request: AnimePlaybackRequest,
  timeoutMs = ANIME_RESOLVE_TIMEOUT_MS
): Promise<PlaybackCandidate | null> {
  const provider = playbackRegistry.getAnimeProvider(providerId);
  if (!provider || !provider.enabled) return null;

  const anilistId = String(request.anilistId);
  const episode = request.episode || 1;
  const variant: AnimePlaybackVariant = request.variant || (request.language === "dub" ? "dub" : "sub");

  return providerResultCache.deduplicate(
    `anime:${providerId}`,
    "anime",
    anilistId,
    1,
    episode,
    variant,
    async () => {
      const start = Date.now();
      let timeoutHandle: ReturnType<typeof setTimeout>;

      try {
        const timeoutPromise = new Promise<null>((resolve) => {
          timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
        });

        const resolutionPromise = provider.resolveAnime
          ? provider.resolveAnime({ ...request, variant, language: variant === "dub" ? "dub" : "sub" })
          : provider.resolve({
              mediaType: "anime",
              anilistId: request.anilistId,
              tmdbId: request.tmdbId,
              episode: request.episode,
              language: variant === "dub" ? "dub" : "sub",
              preferredAudio: request.preferredAudio,
              timeoutMs,
            });

        const candidate = await Promise.race([resolutionPromise, timeoutPromise]);
        clearTimeout(timeoutHandle!);

        if (candidate && candidate.url && candidate.available) {
          const latencyMs = Date.now() - start;
          providerHealthCache.recordSuccess(providerId, latencyMs, variant);
          return {
            ...candidate,
            variant,
            language: variant === "dub" ? "dub" : "sub",
            pool: "ANIME",
            latencyMs,
            status: "CANDIDATE_FOUND",
          };
        }

        return null;
      } catch (err: any) {
        clearTimeout(timeoutHandle!);
        providerHealthCache.recordFailure(providerId, err.message, variant);
        return null;
      }
    }
  );
}

/**
 * Resolves anime candidates concurrently using only verified ANIME PLAYBACK POOL providers.
 */
export async function resolveAnimePlayback(
  request: AnimePlaybackRequest
): Promise<AnimeResolutionResult> {
  const start = Date.now();
  const anilistId = request.anilistId;
  const episode = Math.max(1, request.episode || 1);

  // 1. Get all providers in the system to calculate considered vs skipped
  const allProviders = playbackRegistry.getAllProviders();
  const animePoolProviders = playbackRegistry.getAnimeProviders();

  // 2. Identify strictly skipped general providers
  const providersSkipped: { id: string; name: string; reason: string }[] = [];
  for (const p of allProviders) {
    const isAnimeCapable = p.pools?.includes("ANIME") || p.getCapabilities().supportsAnime;
    if (!isAnimeCapable) {
      providersSkipped.push({
        id: p.id,
        name: p.name,
        reason: "supportsAnime=false (General Movie/TV pool only)",
      });
    }
  }

  // 3. Rank eligible anime providers
  const rankedAnimeProviders = playbackRegistry.rankAnimeProviders(request);
  const providersConsidered = rankedAnimeProviders.map((p) => ({
    id: p.id,
    name: p.name,
    priority: p.priority,
  }));

  const variantRequested: AnimePlaybackVariant =
    request.variant || (request.language === "dub" ? "dub" : "sub");

  const availableVariants = {
    sub: animePoolProviders.some((p) => p.enabled && p.getCapabilities().supportsSub),
    dub: animePoolProviders.some((p) => p.enabled && p.getCapabilities().supportsDub),
    raw: animePoolProviders.some((p) => p.enabled && Boolean(p.getCapabilities().supportsRaw)),
  };

  if (rankedAnimeProviders.length === 0) {
    return {
      sources: [],
      primarySource: null,
      latencyMs: Date.now() - start,
      poolUsed: "ANIME",
      variantRequested,
      availableVariants,
      providersConsidered: [],
      providersSkipped,
      failureReason: `No anime providers capable of supplying '${variantRequested}' configured or enabled in ANIME PLAYBACK POOL`,
    };
  }

  // 4. Launch all eligible anime providers concurrently with bounded timeout
  const resolutionPromises = rankedAnimeProviders.map(async (p, idx) => {
    const candidate = await resolveSingleAnimeProvider(p.id, {
      ...request,
      variant: variantRequested,
      language: variantRequested === "dub" ? "dub" : "sub",
    });
    if (!candidate) return null;

    const score = providerHealthCache.calculateScore(p.id, {
      mediaType: "anime",
      language: variantRequested === "dub" ? "dub" : "sub",
      variant: variantRequested,
      hasLanguageSupport: variantRequested === "dub" ? p.getCapabilities().supportsDub : p.getCapabilities().supportsSub,
    });

    return {
      ...candidate,
      priority: p.priority,
      score,
      serverNumber: idx + 1,
      serverLabel: `Anime HD-${idx + 1} (${p.name.split(" ")[0]} ${variantRequested.toUpperCase()})`,
      mediaType: "anime",
      pool: "ANIME",
      variant: variantRequested,
    } as PlaybackCandidate;
  });

  const settled = await Promise.allSettled(resolutionPromises);
  const candidates: PlaybackCandidate[] = [];

  for (const res of settled) {
    if (res.status === "fulfilled" && res.value && res.value.url) {
      candidates.push(res.value);
    }
  }

  // 5. Also retrieve direct mapped anime sources from database if present
  try {
    const { getActiveMappedSources, mapRecordToCandidate } = await import("../source-mapper");
    const mappedRecords = await getActiveMappedSources({
      mediaType: "anime",
      anilistId,
      episode,
    });
    for (const record of mappedRecords) {
      if (!candidates.some((c) => c.providerId === record.providerId && c.url === record.providerMediaId)) {
        const candidate = mapRecordToCandidate(record, {
          mediaType: "anime",
          anilistId,
          episode,
        });
        candidate.pool = "ANIME";
        candidate.variant = variantRequested;
        candidates.push(candidate);
      }
    }
  } catch {
    // Non-blocking fallback
  }

  // 6. Sort candidates: highest score first, then lowest priority number
  candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.priority - b.priority);

  // 7. Renumber server labels cleanly for UI
  candidates.forEach((cand, idx) => {
    cand.serverNumber = idx + 1;
    if (!cand.serverLabel || cand.serverLabel.startsWith("Anime HD-")) {
      cand.serverLabel = `${cand.providerName || "Anime Source"} (${cand.quality || "HD"})`;
    }
  });

  const latencyMs = Date.now() - start;

  return {
    sources: candidates,
    primarySource: candidates[0] || null,
    latencyMs,
    poolUsed: "ANIME",
    variantRequested,
    availableVariants,
    providersConsidered,
    providersSkipped,
    failureReason: candidates.length === 0 ? `All anime providers exhausted or returned no stream for ${variantRequested}` : undefined,
  };
}
