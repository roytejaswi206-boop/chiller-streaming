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

/**
 * CineSrc Embed Provider — Priority 1
 * Official embed endpoints: https://cinesrc.st
 */
export class CineSrcProvider implements PlaybackProvider {
  id = "cinesrc";
  name = "CineSrc";
  enabled = process.env.CINESRC_ENABLED !== "false";
  requiresApiKey = false;
  supportsMovie = true;
  supportsTV = true;
  priority = 1;

  private getBaseUrl(): string {
    return (
      process.env.CINESRC_BASE_URL?.trim() ||
      process.env.CINESRC_API_URL?.trim() ||
      "https://cinesrc.st"
    ).replace(/\/+$/, "");
  }

  private buildParams(): string {
    return "autoplay=true&controls=true&autonext=true&autoskip=true&continueprompt=false";
  }

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    return Boolean(request.tmdbId);
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request) || !request.tmdbId) return null;

    if (request.mediaType === "tv" || request.mediaType === "anime") {
      return this.getTVPlayback(request.tmdbId, request.season || 1, request.episode || 1);
    }
    return this.getMoviePlayback(request.tmdbId);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsMovie: true,
      supportsTV: true,
      supportsAnime: true,
      supportsSub: true,
      supportsDub: true,
      supportsEvents: true, // Emits cinesrc:ready, cinesrc:play, etc.
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

    const base = this.getBaseUrl();
    const url = `${base}/embed/movie/${id}?${this.buildParams()}`;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: "movie",
      tmdbId: id,
      serverLabel: "HD-1 (CineSrc)",
      serverNumber: 1,
      language: "sub",
      statusText: "CineSrc — Awaiting Player Event",
      progressTrackingSupported: true,
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

    const base = this.getBaseUrl();
    const url = `${base}/embed/tv/${id}?s=${s}&e=${e}&${this.buildParams()}`;

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
      serverLabel: "HD-1 (CineSrc)",
      serverNumber: 1,
      language: "sub",
      statusText: "CineSrc — Awaiting Player Event",
      progressTrackingSupported: true,
      status: "CANDIDATE_FOUND",
    };
  }

  async healthCheck(): Promise<{
    status: ProviderHealthStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "CineSrc is disabled (CINESRC_ENABLED=false)." };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.getBaseUrl()}/embed/movie/550`, {
        method: "HEAD",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://cinesrc.st/",
        },
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Date.now() - start;

      if (res.status < 500) {
        providerHealthCache.recordSuccess(this.id, latencyMs);
        return {
          status: "HTTP_REACHABLE",
          latencyMs,
          message: `HTTP ${res.status} (${latencyMs}ms). Embed player postMessage enabled.`,
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `Server returned HTTP ${res.status}. Embed may still function in browser.`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: "DEGRADED",
        latencyMs,
        message: `Server probe note (${err.message}). Embed operates independently in browser.`,
      };
    }
  }
}
