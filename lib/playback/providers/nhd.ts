import { PlaybackProvider, PlaybackSource, ProviderHealthStatus } from "../types";

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
      statusText: "NHD Stream (Auto-Failover)",
      progressTrackingSupported: false,
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
      statusText: "NHD Stream (Auto-Failover)",
      progressTrackingSupported: false,
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
      statusText: "NHD Anime Stream",
      progressTrackingSupported: false,
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
        signal: AbortSignal.timeout(6000),
      });

      const latencyMs = Date.now() - start;

      if (res.ok || res.status === 200 || res.status === 301 || res.status === 302) {
        return {
          status: "HTTP_REACHABLE",
          latencyMs,
          message: `HTTP ${res.status} reachable (${latencyMs}ms). Internal auto-failover active; cross-origin iframe applies (PLAYER_NOT_VERIFIABLE).`,
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `Endpoint returned HTTP status ${res.status}`,
      };
    } catch (err: any) {
      return {
        status: "FAILED",
        latencyMs: Date.now() - start,
        message: err.name === "TimeoutError" ? "Connection timed out (>6s)" : err.message || "Failed to reach NHD",
      };
    }
  }
}
