import {
  PlaybackProvider,
  PlaybackSource,
  PlaybackCandidate,
  PlaybackRequest,
  PlaybackPool,
  ProviderCapabilities,
  ProviderHealth,
  ProviderHealthStatus,
} from "../types";
import { providerHealthCache } from "../health-cache";

/**
 * Vidking Embed Provider — Priority 3 (Optional Fallback)
 * Enable via: VIDKING_ENABLED=true
 */
export class VidkingProvider implements PlaybackProvider {
  id = "vidking";
  name = "Vidking";
  enabled = process.env.VIDKING_ENABLED === "true";
  pools: PlaybackPool[] = ["GENERAL"];
  requiresApiKey = false;
  supportsMovie = true;
  supportsTV = true;
  supportsAnime = false;
  priority = 3;

  private getBaseUrl(): string {
    return (process.env.VIDKING_BASE_URL?.trim() || "https://www.vidking.net").replace(/\/+$/, "");
  }

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    if (request.mediaType === "anime" || request.mediaClass === "ANIME" || request.targetPool === "ANIME") {
      return false;
    }
    return Boolean(request.tmdbId);
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request) || !request.tmdbId) return null;

    if (request.mediaType === "tv") {
      return this.getTVPlayback(request.tmdbId, request.season || 1, request.episode || 1);
    }
    return this.getMoviePlayback(request.tmdbId);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsMovie: true,
      supportsTV: true,
      supportsAnime: false,
      supportsSub: true,
      supportsDub: false,
      supportsEvents: false,
      requiresApiKey: false,
      hasCaptions: false,
    };
  }

  getHealth(): ProviderHealth {
    return providerHealthCache.getHealth(this.id);
  }

  async getMoviePlayback(tmdbId: number | string): Promise<PlaybackSource | null> {
    if (!this.enabled) return null;
    const id = String(tmdbId).trim();
    if (!id) return null;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url: `${this.getBaseUrl()}/embed/movie/${id}`,
      available: true,
      priority: this.priority,
      mediaType: "movie",
      tmdbId: id,
      serverLabel: "HD-3 (Vidking)",
      serverNumber: 3,
      language: "sub",
      statusText: "Vidking — Awaiting Player Event",
      status: "CANDIDATE_FOUND",
    };
  }

  async getTVPlayback(
    tmdbId: number | string,
    season: number,
    episode: number
  ): Promise<PlaybackSource | null> {
    if (!this.enabled) return null;
    const id = String(tmdbId).trim();
    const s = Math.max(1, season || 1);
    const e = Math.max(1, episode || 1);
    if (!id) return null;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url: `${this.getBaseUrl()}/embed/tv/${id}/${s}/${e}`,
      available: true,
      priority: this.priority,
      mediaType: "tv",
      tmdbId: id,
      season: s,
      episode: e,
      serverLabel: "HD-3 (Vidking)",
      serverNumber: 3,
      language: "sub",
      statusText: "Vidking — Awaiting Player Event",
      status: "CANDIDATE_FOUND",
    };
  }

  async healthCheck(): Promise<{
    status: ProviderHealthStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "Vidking is disabled (set VIDKING_ENABLED=true to enable)." };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.getBaseUrl()}/embed/movie/550`, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Date.now() - start;
      if (res.status < 500) {
        providerHealthCache.recordSuccess(this.id, latencyMs);
        return {
          status: "HTTP_REACHABLE",
          latencyMs,
          message: `HTTP ${res.status} (${latencyMs}ms).`,
        };
      }
      return {
        status: "DEGRADED",
        latencyMs,
        message: `HTTP ${res.status} from probe.`,
      };
    } catch (err: any) {
      return {
        status: "DEGRADED",
        latencyMs: Date.now() - start,
        message: `Server probe note: ${err.message}. Embed operates in browser.`,
      };
    }
  }
}
