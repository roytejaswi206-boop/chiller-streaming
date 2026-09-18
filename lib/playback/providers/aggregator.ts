import { getPlaybackAggregatorUrl } from "@/lib/settings";
import { PlaybackProvider, PlaybackSource, ProviderHealthStatus } from "../types";

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
      statusText: "Aggregator Stream",
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
      statusText: "Aggregator Stream",
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
        signal: AbortSignal.timeout(6000),
      });

      const latencyMs = Date.now() - start;

      if (res.ok) {
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
