import { PlaybackProvider, PlaybackSource, ProviderHealthStatus } from "../types";

/**
 * CineSrc Embed Provider — Priority 1
 * Official embed endpoints: https://cinesrc.st
 *
 * Movie:  https://cinesrc.st/embed/movie/{tmdbId}
 * TV:     https://cinesrc.st/embed/tv/{tmdbId}?s={season}&e={episode}
 *
 * Documented query parameters (optional enhancements):
 *   autoplay, controls, autonext, autoskip, continueprompt
 *
 * postMessage events (listen with event.origin === "https://cinesrc.st"):
 *   cinesrc:ready, cinesrc:play, cinesrc:pause, cinesrc:timeupdate,
 *   cinesrc:seeking, cinesrc:seeked, cinesrc:ended, cinesrc:volumechange,
 *   cinesrc:ratechange, cinesrc:loadedmetadata, cinesrc:nextepisode,
 *   cinesrc:skipintro, cinesrc:sourceused, cinesrc:close, cinesrc:error,
 *   cinesrc:response
 *
 * Player commands via postMessage to origin "https://cinesrc.st":
 *   { type: "cinesrc:command", command, args }
 *   Commands: play, pause, seek, setVolume, setMuted, setPlaybackRate,
 *             getCurrentTime, getDuration, getVolume, getMuted, getPaused,
 *             getPlaybackRate
 *
 * IMPORTANT: cinesrc:nextepisode carries { season, episode, internalNavigation, source }
 * When internalNavigation === true, do NOT replace the iframe — let CineSrc handle it.
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
    // Support both CINESRC_BASE_URL and legacy CINESRC_API_URL
    const url = (
      process.env.CINESRC_BASE_URL?.trim() ||
      process.env.CINESRC_API_URL?.trim() ||
      "https://cinesrc.st"
    ).replace(/\/+$/, "");
    return url;
  }

  private buildParams(): string {
    return "autoplay=true&controls=true&autonext=true&autoskip=true&continueprompt=false";
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
      statusText: "CineSrc — Awaiting Player Event",
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
      statusText: "CineSrc — Awaiting Player Event",
      progressTrackingSupported: true,
      status: "DISCOVERED",
    };
  }

  /**
   * Health check is advisory only.
   * Do NOT disable CineSrc just because a server-side probe returns an error.
   * Many embed CDNs block server-to-server requests by design.
   */
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
        signal: AbortSignal.timeout(8000),
      });

      const latencyMs = Date.now() - start;

      // 2xx, 3xx = reachable; 4xx/5xx from server probe does NOT disqualify embeds
      if (res.status < 500) {
        return {
          status: "HTTP_REACHABLE",
          latencyMs,
          message: `HTTP ${res.status} (${latencyMs}ms). Browser iframes operate independently — server probe result does not reflect embed playback.`,
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `Server returned HTTP ${res.status}. Embed may still function in browser.`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      // Network error from server does NOT mean the embed is broken in browser
      return {
        status: "DEGRADED",
        latencyMs,
        message: `Server probe failed (${err.message}). This does NOT disqualify CineSrc — embed providers block server-side requests by design.`,
      };
    }
  }
}
