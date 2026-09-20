import {
  PlaybackProvider,
  PlaybackSource,
  PlaybackCandidate,
  PlaybackRequest,
  ProviderCapabilities,
  ProviderHealth,
  ProviderHealthStatus,
} from "../types";
import { providerHealthCache } from "../health-cache";

export class NHDProvider implements PlaybackProvider {
  id = "nhd";
  name = "NHD Embed";
  enabled = process.env.NHD_ENABLED !== "false";
  requiresApiKey = false;
  supportsMovie = true;
  supportsTV = true;
  supportsAnime = true;
  priority = 1;

  private getBaseUrl(): string {
    return (process.env.NHD_API_URL?.trim() || "https://nhdapi.st").replace(/\/+$/, "");
  }

  private getApiKey(): string {
    return process.env.NHD_API_KEY?.trim() || "";
  }

  private withKey(url: string): string {
    const key = this.getApiKey();
    if (!key) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}key=${encodeURIComponent(key)}`;
  }

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    if (request.mediaType === "movie" && request.tmdbId) return true;
    if (request.mediaType === "tv" && request.tmdbId) return true;
    if (request.mediaType === "anime" && (request.anilistId || request.tmdbId)) return true;
    return false;
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;

    if (request.mediaType === "anime" && request.anilistId) {
      return this.getAnimePlayback(request.anilistId, request.episode || 1);
    }
    if (request.mediaType === "tv" && request.tmdbId) {
      return this.getTVPlayback(request.tmdbId, request.season || 1, request.episode || 1);
    }
    if (request.tmdbId) {
      return this.getMoviePlayback(request.tmdbId);
    }
    return null;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsMovie: true,
      supportsTV: true,
      supportsAnime: true,
      supportsSub: true,
      supportsDub: true,
      supportsEvents: false,
      requiresApiKey: false,
      hasCaptions: true,
    };
  }

  getHealth(): ProviderHealth {
    return providerHealthCache.getHealth(this.id);
  }

  async getMoviePlayback(tmdbId: number | string): Promise<PlaybackSource | null> {
    const id = String(tmdbId).trim();
    if (!id) return null;

    const rawUrl = `${this.getBaseUrl()}/movie/${id}`;
    const url = this.withKey(rawUrl);

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: "movie",
      tmdbId: id,
      serverLabel: "HD-1",
      serverNumber: 1,
      language: "sub",
      statusText: "NHD Stream (Auto-Failover)",
      progressTrackingSupported: false,
      status: "CANDIDATE_FOUND",
    };
  }

  async getTVPlayback(
    tmdbId: number | string,
    season: number,
    episode: number
  ): Promise<PlaybackSource | null> {
    const id = String(tmdbId).trim();
    const s = Math.max(1, season || 1);
    const e = Math.max(1, episode || 1);
    if (!id) return null;

    const rawUrl = `${this.getBaseUrl()}/tv/${id}/${s}/${e}`;
    const url = this.withKey(rawUrl);

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: "tv",
      tmdbId: id,
      season: s,
      episode: e,
      serverLabel: "HD-1",
      serverNumber: 1,
      language: "sub",
      statusText: "NHD Stream (Auto-Failover)",
      progressTrackingSupported: false,
      status: "CANDIDATE_FOUND",
    };
  }

  async getAnimePlayback(
    anilistId: number | string,
    episode: number
  ): Promise<PlaybackSource | null> {
    const id = String(anilistId).trim();
    const ep = Math.max(1, episode || 1);
    if (!id) return null;

    const rawUrl = `${this.getBaseUrl()}/anime/${id}/${ep}`;
    const url = this.withKey(rawUrl);

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: "anime",
      anilistId: id,
      episode: ep,
      serverLabel: "HD-1 (NHD)",
      serverNumber: 1,
      language: "sub",
      statusText: "NHD Anime Stream",
      progressTrackingSupported: false,
      status: "CANDIDATE_FOUND",
    };
  }

  async healthCheck(): Promise<{
    status: ProviderHealthStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "NHD provider is disabled (NHD_ENABLED=false)." };
    }

    const start = Date.now();
    try {
      const testUrl = this.withKey(`${this.getBaseUrl()}/movie/550`);
      const res = await fetch(testUrl, {
        method: "HEAD",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Date.now() - start;

      if (res.ok || res.status === 200 || res.status === 301 || res.status === 302) {
        providerHealthCache.recordSuccess(this.id, latencyMs);
        return {
          status: "HTTP_REACHABLE",
          latencyMs,
          message: `HTTP ${res.status} reachable (${latencyMs}ms). Cross-origin iframe applies (PLAYER_NOT_VERIFIABLE).`,
        };
      }

      providerHealthCache.recordFailure(this.id, `HTTP ${res.status}`);
      return {
        status: "DEGRADED",
        latencyMs,
        message: `Endpoint returned HTTP status ${res.status}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      providerHealthCache.recordFailure(this.id, err.message);
      return {
        status: "FAILED",
        latencyMs,
        message: err.name === "TimeoutError" ? "Connection timed out (>4s)" : err.message || "Failed to reach NHD",
      };
    }
  }
}
