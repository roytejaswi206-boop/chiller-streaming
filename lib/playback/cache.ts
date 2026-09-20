import { PlaybackCandidate } from "./types";

interface CacheEntry {
  candidate: PlaybackCandidate;
  expiresAt: number;
}

/**
 * Short-lived in-memory cache for provider resolution results.
 * Key: providerId:mediaType:mediaId:season:episode:language
 * Default TTL: 10 minutes (600,000 ms)
 */
class ProviderResultCache {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<PlaybackCandidate | null>>();

  private buildKey(
    providerId: string,
    mediaType: string,
    mediaId: string | number,
    season = 1,
    episode = 1,
    language = "sub"
  ): string {
    return `${providerId}:${mediaType}:${mediaId}:${season}:${episode}:${language}`.toLowerCase();
  }

  get(
    providerId: string,
    mediaType: string,
    mediaId: string | number,
    season = 1,
    episode = 1,
    language = "sub"
  ): PlaybackCandidate | null {
    const key = this.buildKey(providerId, mediaType, mediaId, season, episode, language);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.candidate;
  }

  set(
    providerId: string,
    mediaType: string,
    mediaId: string | number,
    candidate: PlaybackCandidate,
    season = 1,
    episode = 1,
    language = "sub",
    ttlMs = 10 * 60 * 1000
  ): void {
    const key = this.buildKey(providerId, mediaType, mediaId, season, episode, language);
    // Respect candidate's explicit expiration if shorter
    const expiration = candidate.expiresAt ? Math.min(candidate.expiresAt, Date.now() + ttlMs) : Date.now() + ttlMs;

    this.cache.set(key, {
      candidate,
      expiresAt: expiration,
    });
  }

  /**
   * In-Flight Request Deduplication:
   * If multiple simultaneous requests for the same provider + content arrive,
   * share the same active promise to prevent duplicate external calls.
   */
  async deduplicate(
    providerId: string,
    mediaType: string,
    mediaId: string | number,
    season = 1,
    episode = 1,
    language = "sub",
    factory: () => Promise<PlaybackCandidate | null>
  ): Promise<PlaybackCandidate | null> {
    const cached = this.get(providerId, mediaType, mediaId, season, episode, language);
    if (cached) return cached;

    const key = this.buildKey(providerId, mediaType, mediaId, season, episode, language);
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        const result = await factory();
        if (result && result.available && result.url) {
          this.set(providerId, mediaType, mediaId, result, season, episode, language);
        }
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const providerResultCache = new ProviderResultCache();
