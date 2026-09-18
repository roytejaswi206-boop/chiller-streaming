import { PlaybackProvider, PlaybackSource, ProviderHealthStatus } from "../types";

/**
 * VidSrc Embed Provider — Priority 2
 * Active official host: https://vidsrc.sbs
 *
 * Movie:  https://vidsrc.sbs/embed/movie/{tmdbId}
 * TV:     https://vidsrc.sbs/embed/tv/{tmdbId}/{season}/{episode}
 *         (path-based, NOT query params)
 *
 * postMessage events (listen with event.origin matching VIDSRC_BASE_URL):
 *   { player_status: "playing" | "paused" | "error" }
 *   { player_progress, player_duration }
 *
 * IMPORTANT: Do NOT use vidsrc.sh — that host is deprecated and returns timeouts
 *            or blocks server-side probes. The correct current host is vidsrc.sbs.
 */
export class VidSrcProvider implements PlaybackProvider {
  id = "vidsrc";
  name = "VidSrc";
  enabled = process.env.VIDSRC_ENABLED !== "false";
  requiresApiKey = false;
  supportsMovie = true;
  supportsTV = true;
  priority = 2;

  private getBaseUrl(): string {
    // Default to the active official host vidsrc.sbs
    const raw = process.env.VIDSRC_BASE_URL?.trim() || "https://vidsrc.sbs";
    return raw.replace(/\/+$/, "");
  }

  /** Returns just the hostname for postMessage origin filtering */
  getOrigin(): string {
    try {
      return new URL(this.getBaseUrl()).origin;
    } catch {
      return "https://vidsrc.sbs";
    }
  }

  async getMoviePlayback(tmdbId: number | string): Promise<PlaybackSource | null> {
    const id = String(tmdbId).trim();
    if (!id) return null;

    const url = `${this.getBaseUrl()}/embed/movie/${id}`;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: "movie",
      tmdbId: id,
      statusText: "VidSrc — Awaiting Player Event",
      progressTrackingSupported: true,
      status: "DISCOVERED",
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

    // TV uses path-based routing, never query params
    const url = `${this.getBaseUrl()}/embed/tv/${id}/${s}/${e}`;

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
      statusText: "VidSrc — Awaiting Player Event",
      progressTrackingSupported: true,
      status: "DISCOVERED",
    };
  }

  /**
   * Advisory health check only.
   * HTTP 429 from VidSrc server-side means rate-limited, NOT that browser embeds are broken.
   * Never disable VidSrc solely based on server probe failures.
   */
  async healthCheck(): Promise<{
    status: ProviderHealthStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "VidSrc is disabled (VIDSRC_ENABLED=false)." };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.getBaseUrl()}/embed/movie/550`, {
        method: "HEAD",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://vidsrc.sbs/",
        },
        signal: AbortSignal.timeout(8000),
      });

      const latencyMs = Date.now() - start;

      if (res.status < 500) {
        return {
          status: "HTTP_REACHABLE",
          latencyMs,
          message: `HTTP ${res.status} (${latencyMs}ms). ${
            res.status === 429
              ? "Rate-limited on server probe (expected). Browser iframes are not rate-limited the same way."
              : "Reachable. Browser iframes may play independently."
          }`,
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `HTTP ${res.status} from server probe. Embed may still play in browser.`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: "DEGRADED",
        latencyMs,
        message: `Server probe failed (${err.message}). Embed may still function in browser — server probes are often blocked by CDN rules.`,
      };
    }
  }
}
