import { playbackRegistry } from "./registry";
import { providerResultCache } from "./cache";
import { providerHealthCache } from "./health-cache";
import { PlaybackCandidate, PlaybackRequest } from "./types";

const DEFAULT_RESOLVE_TIMEOUT_MS = parseInt(
  process.env.PLAYBACK_RESOLVE_TIMEOUT_MS || "3500",
  10
);

/**
 * Executes a single provider resolution with timeout and in-flight deduplication.
 */
async function resolveSingleProvider(
  providerId: string,
  request: PlaybackRequest,
  timeoutMs = DEFAULT_RESOLVE_TIMEOUT_MS
): Promise<PlaybackCandidate | null> {
  const provider = playbackRegistry.getProvider(providerId);
  if (!provider || !provider.enabled || !provider.supports(request)) return null;

  const mediaId = request.tmdbId || request.anilistId || "0";
  const season = request.season || 1;
  const episode = request.episode || 1;
  const language = request.language || "sub";

  return providerResultCache.deduplicate(
    providerId,
    request.mediaType,
    mediaId,
    season,
    episode,
    language,
    async () => {
      const start = Date.now();
      let timeoutHandle: ReturnType<typeof setTimeout>;

      try {
        const timeoutPromise = new Promise<null>((resolve) => {
          timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
        });

        const resolutionPromise = provider.resolve({
          ...request,
          timeoutMs,
        });

        const candidate = await Promise.race([resolutionPromise, timeoutPromise]);
        clearTimeout(timeoutHandle!);

        if (candidate && candidate.url && candidate.available) {
          const latencyMs = Date.now() - start;
          providerHealthCache.recordSuccess(providerId, latencyMs);
          return {
            ...candidate,
            latencyMs,
            status: "CANDIDATE_FOUND",
          };
        }

        return null;
      } catch (err: any) {
        clearTimeout(timeoutHandle!);
        providerHealthCache.recordFailure(providerId, err.message);
        return null;
      }
    }
  );
}

/**
 * CONCURRENT FASTEST-SOURCE RESOLUTION ENGINE
 *
 * 1. Launches all ranked providers in parallel (NO sequential waiting).
 * 2. Does NOT wait for the slowest provider to return the candidates list.
 * 3. Returns all valid candidates sorted by score / health ranking.
 */
export async function resolveCandidatesConcurrently(
  request: PlaybackRequest
): Promise<{
  candidates: PlaybackCandidate[];
  primaryCandidate: PlaybackCandidate | null;
  fastestMs: number;
}> {
  const rankedProviders = playbackRegistry.rankProviders(request);
  if (rankedProviders.length === 0) {
    return { candidates: [], primaryCandidate: null, fastestMs: 0 };
  }

  const start = Date.now();

  // Launch all eligible providers concurrently
  const resolutionPromises = rankedProviders.map(async (p, idx) => {
    const candidate = await resolveSingleProvider(p.id, request);
    if (!candidate) return null;

    const score = providerHealthCache.calculateScore(p.id, {
      mediaType: request.mediaType,
      language: request.language,
      hasLanguageSupport: request.language === "dub" ? p.getCapabilities().supportsDub : true,
    });

    return {
      ...candidate,
      priority: p.priority,
      score,
      serverNumber: idx + 1,
      serverLabel: `HD-${idx + 1} (${p.name.split(" ")[0]})`,
    } as PlaybackCandidate;
  });

  // Await all concurrently settled (capped by per-provider timeout ~3.5s)
  const settled = await Promise.allSettled(resolutionPromises);
  const candidates: PlaybackCandidate[] = [];

  for (const res of settled) {
    if (res.status === "fulfilled" && res.value && res.value.url) {
      candidates.push(res.value);
    }
  }

  // Also retrieve any direct authorized mapped sources from database
  try {
    const { getActiveMappedSources, mapRecordToCandidate } = await import("./source-mapper");
    const mappedRecords = await getActiveMappedSources(request);
    for (const record of mappedRecords) {
      if (!candidates.some((c) => c.providerId === record.providerId && c.url === record.providerMediaId)) {
        const candidate = mapRecordToCandidate(record, request);
        candidates.push(candidate);
      }
    }
  } catch (err) {
    // Non-blocking fallback
  }

  // Sort candidates: highest score first, then lowest priority number
  candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.priority - b.priority);

  // Renumber server labels cleanly
  candidates.forEach((cand, idx) => {
    cand.serverNumber = idx + 1;
    if (!cand.serverLabel || cand.serverLabel.startsWith("HD-")) {
      cand.serverLabel = `${cand.providerName || "Source"} (${cand.quality || "HD"})`;
    }
  });

  const fastestMs = Date.now() - start;

  if (candidates.length > 0 && candidates[0]) {
    import("@/lib/prisma")
      .then(({ prisma }) => {
        prisma.playbackAttempt
          .create({
            data: {
              mediaType: request.mediaType,
              tmdbId:
                typeof request.tmdbId === "number"
                  ? request.tmdbId
                  : parseInt(String(request.tmdbId || 0), 10) || null,
              providerId: candidates[0].providerId,
              status: "SUCCESS",
              latencyMs: fastestMs,
            },
          })
          .catch(() => {});
      })
      .catch(() => {});
  }

  return {
    candidates,
    primaryCandidate: candidates[0] || null,
    fastestMs,
  };
}

/**
 * RACES for the very first usable candidate to return in < 1 second.
 */
export async function resolveFirstUsableCandidate(
  request: PlaybackRequest
): Promise<PlaybackCandidate | null> {
  const rankedProviders = playbackRegistry.rankProviders(request);
  if (rankedProviders.length === 0) return null;

  // Race each provider resolution: first one that returns a valid candidate wins
  return new Promise((resolve) => {
    let resolved = false;
    let pendingCount = rankedProviders.length;

    rankedProviders.forEach(async (provider, idx) => {
      try {
        const candidate = await resolveSingleProvider(provider.id, request);
        if (candidate && candidate.url && !resolved) {
          resolved = true;
          resolve({
            ...candidate,
            serverNumber: idx + 1,
            serverLabel: `HD-${idx + 1} (${provider.name.split(" ")[0]})`,
          });
        }
      } catch {
        // Ignored
      } finally {
        pendingCount--;
        if (pendingCount === 0 && !resolved) {
          resolve(null);
        }
      }
    });
  });
}
