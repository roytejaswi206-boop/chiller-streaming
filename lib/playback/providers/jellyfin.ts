/**
 * lib/playback/providers/jellyfin.ts
 *
 * Jellyfin Self-Hosted Media Server Adapter
 * Official API Documentation: https://api.jellyfin.org/
 * Classification: SELF_HOSTED MEDIA SERVER
 *
 * Configuration:
 *   - JELLYFIN_ENABLED=false (default)
 *   - JELLYFIN_URL=http://localhost:8096
 *   - JELLYFIN_API_KEY=
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

export class JellyfinProvider implements PlaybackProvider {
  id = "jellyfin";
  name = "Jellyfin";
  enabled = process.env.JELLYFIN_ENABLED === "true";
  priority = 17;
  requiresApiKey = true;

  private getUrl(): string {
    return (process.env.JELLYFIN_URL?.trim() || "http://localhost:8096").replace(/\/+$/, "");
  }

  private getApiKey(): string | undefined {
    return process.env.JELLYFIN_API_KEY?.trim() || process.env.JELLYFIN_TOKEN?.trim();
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
      supportsDub: true,
      supportsEvents: true,
      requiresApiKey: true,
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
      return { status: "DISABLED", message: "JELLYFIN_ENABLED is false" };
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        status: "NOT_CONFIGURED",
        message: "JELLYFIN_API_KEY is not configured",
      };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${this.getUrl()}/System/Info/Public`, {
        headers: {
          "X-Emby-Token": apiKey,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (res.ok) {
        return {
          status: "ACTIVE",
          latencyMs,
          message: `Jellyfin Server Online (${latencyMs}ms)`,
        };
      }

      if (res.status === 401) {
        return {
          status: "FAILED",
          latencyMs,
          message: "Jellyfin Authentication Failed: Invalid API Key",
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `Jellyfin returned status ${res.status}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: "FAILED",
        latencyMs,
        message: err.name === "AbortError" ? "Jellyfin connection timed out (4s)" : err.message,
      };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;

    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "jellyfin");

    if (!source) return null;

    const itemId = source.providerMediaId;
    const apiKey = this.getApiKey();
    const url = itemId.startsWith("http")
      ? itemId
      : `${this.getUrl()}/Videos/${itemId}/stream.m3u8?api_key=${apiKey}&Static=true`;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "hls",
      url,
      available: true,
      priority: this.priority,
      mediaType: request.mediaType,
      tmdbId: request.tmdbId,
      anilistId: request.anilistId,
      season: request.season,
      episode: request.episode,
      quality: source.quality || "Original (Direct)",
      serverLabel: "Jellyfin (Self-Hosted HLS)",
      statusText: "Jellyfin — Direct Stream",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
