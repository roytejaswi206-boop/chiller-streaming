import { getPlaybackAggregatorUrl } from "@/lib/settings";
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

export class AggregatorProvider implements PlaybackProvider {
  id = "aggregator";
  name = "Self-hosted Aggregator";
  enabled = true;
  requiresApiKey = false;
  supportsMovie = true;
  supportsTV = true;
  priority = 5;

  private async getAggregatorUrl(): Promise<string> {
    const raw = (await getPlaybackAggregatorUrl())?.trim();
    if (!raw) return "";

    try {
      const url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return raw.replace(/\/+$/, "");
    } catch {
      return "";
    }
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
      supportsDub: true,
      supportsEvents: true,
      requiresApiKey: false,
      hasCaptions: true,
    };
  }

  getHealth(): ProviderHealth {
    return providerHealthCache.getHealth(this.id);
  }

  async getMoviePlayback(tmdbId: number | string): Promise<PlaybackSource | null> {
    const baseUrl = await this.getAggregatorUrl();
    if (!baseUrl) return null;

    const id = String(tmdbId).trim();
    if (!id) return null;

    const url = `${baseUrl}/embed/movie/${id}`;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: "movie",
      tmdbId: id,
      serverLabel: "Aggregator",
      serverNumber: 5,
      language: "sub",
      statusText: "Aggregator Stream",
      status: "CANDIDATE_FOUND",
    };
  }

  async getTVPlayback(tmdbId: number | string, season: number, episode: number): Promise<PlaybackSource | null> {
    const baseUrl = await this.getAggregatorUrl();
    if (!baseUrl) return null;

    const id = String(tmdbId).trim();
    const s = Math.max(1, season || 1);
    const e = Math.max(1, episode || 1);
    if (!id) return null;

    const url = `${baseUrl}/embed/tv/${id}/${s}/${e}`;

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
      serverLabel: "Aggregator",
      serverNumber: 5,
      language: "sub",
      statusText: "Aggregator Stream",
      status: "CANDIDATE_FOUND",
    };
  }

  async healthCheck(): Promise<{
    status: ProviderHealthStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "Provider is disabled" };
    }

    const baseUrl = await this.getAggregatorUrl();
    if (!baseUrl) {
      return {
        status: "NOT_CONFIGURED",
        message: "PLAYBACK_AGGREGATOR_URL is not set in environment or database.",
      };
    }

    const start = Date.now();
    try {
      const testUrl = `${baseUrl}/health`;
      const res = await fetch(testUrl, {
        method: "GET",
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Date.now() - start;

      if (res.ok) {
        providerHealthCache.recordSuccess(this.id, latencyMs);
        return {
          status: "ACTIVE",
          latencyMs,
          message: `Operational (${latencyMs}ms)`,
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `Health endpoint returned status ${res.status}`,
      };
    } catch (err: any) {
      return {
        status: "FAILED",
        latencyMs: Date.now() - start,
        message: err.name === "TimeoutError" ? "Aggregator connection timed out" : (err.message || "Failed to reach aggregator"),
      };
    }
  }
}
