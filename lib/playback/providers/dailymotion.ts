/**
 * lib/playback/providers/dailymotion.ts
 *
 * Dailymotion Video Platform Adapter
 * Official API Documentation: https://developers.dailymotion.com/
 * Web Player Documentation: https://developers.dailymotion.com/player/
 *
 * Capabilities:
 *   - Official Web Player embed integration
 *   - Player events & postMessage API
 *   - Subtitles & quality selection
 * Configuration:
 *   - DAILYMOTION_ENABLED=false (default)
 *   - DAILYMOTION_PLAYER_ID=x7s6f
 *   - DAILYMOTION_API_KEY=
 */

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
import { getActiveMappedSources } from "../source-mapper";

export class DailymotionProvider implements PlaybackProvider {
  id = "dailymotion";
  name = "Dailymotion";
  enabled = process.env.DAILYMOTION_ENABLED === "true";
  priority = 16;
  requiresApiKey = false;

  private getPlayerId(): string {
    return process.env.DAILYMOTION_PLAYER_ID?.trim() || "x7s6f";
  }

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    return Boolean(request.tmdbId || request.anilistId);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsMovie: true,
      supportsTV: true,
      supportsAnime: true,
      supportsSub: true,
      supportsDub: false,
      supportsEvents: true, // Emits Dailymotion player events
      requiresApiKey: false,
      hasCaptions: true,
    };
  }

  getHealth(): ProviderHealth {
    return providerHealthCache.getHealth(this.id);
  }

  async healthCheck(): Promise<{
    status: ProviderHealthStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "DAILYMOTION_ENABLED is false" };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Probe public API v2 endpoint
      const res = await fetch("https://api.dailymotion.com/videos?limit=1&fields=id", {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (res.ok) {
        return {
          status: "ACTIVE",
          latencyMs,
          message: `Dailymotion API v2 Online (${latencyMs}ms)`,
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `Dailymotion API returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: "FAILED",
        latencyMs,
        message: err.name === "AbortError" ? "Dailymotion API timed out (4s)" : err.message,
      };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;

    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "dailymotion");

    if (!source) return null;

    const videoId = source.providerMediaId;
    const playerId = this.getPlayerId();
    const url = videoId.startsWith("http")
      ? videoId
      : `https://geo.dailymotion.com/player/${playerId}.html?video=${videoId}&autoplay=true`;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: request.mediaType,
      tmdbId: request.tmdbId,
      anilistId: request.anilistId,
      season: request.season,
      episode: request.episode,
      quality: source.quality || "1080p HD",
      serverLabel: "Dailymotion (Official)",
      statusText: "Dailymotion — Ready",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
