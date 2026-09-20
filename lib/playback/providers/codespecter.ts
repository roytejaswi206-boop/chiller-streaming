import { getCodeSpecterApiKey } from "@/lib/settings";
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

export class CodeSpecterProvider implements PlaybackProvider {
  id = "codespecter";
  name = "NexStream / CodeSpecter";
  enabled = process.env.CODESPECTER_ENABLED === "true";
  requiresApiKey = true;
  supportsMovie = true;
  supportsTV = true;
  priority = 4;

  private async getApiKey(): Promise<string> {
    const dbKey = await getCodeSpecterApiKey();
    return dbKey || process.env.CODESPECTER_API_KEY?.trim() || process.env.NEXSTREAM_API_KEY?.trim() || "";
  }

  private getBaseUrl(): string {
    return (process.env.CODESPECTER_API_URL?.trim() || "https://api.codespecters.com").replace(/\/+$/, "");
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
      supportsAnime: false,
      supportsSub: true,
      supportsDub: false,
      supportsEvents: false,
      requiresApiKey: true,
      hasCaptions: false,
    };
  }

  getHealth(): ProviderHealth {
    return providerHealthCache.getHealth(this.id);
  }

  async getMoviePlayback(tmdbId: number | string): Promise<PlaybackSource | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) return null;

    const id = String(tmdbId).trim();
    if (!id) return null;

    const url = `${this.getBaseUrl()}/embed/movie/${id}?apikey=${encodeURIComponent(apiKey)}`;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: "movie",
      tmdbId: id,
      serverLabel: "HD-4 (NexStream)",
      serverNumber: 4,
      language: "sub",
      statusText: "NexStream Stream",
      progressTrackingSupported: false,
      status: "CANDIDATE_FOUND",
    };
  }

  async getTVPlayback(
    tmdbId: number | string,
    season: number,
    episode: number
  ): Promise<PlaybackSource | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) return null;

    const id = String(tmdbId).trim();
    const s = Math.max(1, season || 1);
    const e = Math.max(1, episode || 1);
    if (!id) return null;

    const url = `${this.getBaseUrl()}/embed/tv/${id}/${s}/${e}?apikey=${encodeURIComponent(apiKey)}`;

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
      serverLabel: "HD-4 (NexStream)",
      serverNumber: 4,
      language: "sub",
      statusText: "NexStream Stream",
      progressTrackingSupported: false,
      status: "CANDIDATE_FOUND",
    };
  }

  async healthCheck(): Promise<{
    status: ProviderHealthStatus;
    latencyMs?: number;
    message?: string;
  }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return {
        status: "NOT_CONFIGURED",
        message: "CODESPECTER_API_KEY / NEXSTREAM_API_KEY is not configured.",
      };
    }

    if (!this.enabled && process.env.CODESPECTER_ENABLED !== undefined && process.env.CODESPECTER_ENABLED !== "true") {
      return { status: "DISABLED", message: "NexStream / CodeSpecter is disabled." };
    }

    const start = Date.now();
    try {
      const testUrl = `${this.getBaseUrl()}/embed/movie/550?apikey=${encodeURIComponent(apiKey)}`;
      const res = await fetch(testUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Date.now() - start;

      if (res.ok || res.status === 200 || res.status === 301 || res.status === 302) {
        providerHealthCache.recordSuccess(this.id, latencyMs);
        return {
          status: "HTTP_REACHABLE",
          latencyMs,
          message: `Connected successfully (HTTP ${res.status}, ${latencyMs}ms). Cross-origin iframe applies.`,
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `Endpoint returned HTTP status ${res.status}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: "FAILED",
        latencyMs,
        message: err.name === "TimeoutError" ? "Connection timed out" : err.message || "Failed to reach CodeSpecter",
      };
    }
  }
}
