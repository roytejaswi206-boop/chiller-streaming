/**
 * lib/playback/providers/plex.ts
 *
 * Plex Media Server Adapter
 * Classification: SELF_HOSTED MEDIA SERVER
 *
 * Configuration:
 *   - PLEX_ENABLED=false (default)
 *   - PLEX_URL=http://localhost:32400
 *   - PLEX_TOKEN=
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

export class PlexProvider implements PlaybackProvider {
  id = "plex";
  name = "Plex";
  enabled = process.env.PLEX_ENABLED === "true";
  priority = 18;
  requiresApiKey = true;

  private getUrl(): string {
    return (process.env.PLEX_URL?.trim() || "http://localhost:32400").replace(/\/+$/, "");
  }

  private getToken(): string | undefined {
    return process.env.PLEX_TOKEN?.trim() || process.env.PLEX_API_KEY?.trim();
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
      return { status: "DISABLED", message: "PLEX_ENABLED is false" };
    }

    const token = this.getToken();
    if (!token) {
      return {
        status: "NOT_CONFIGURED",
        message: "PLEX_TOKEN is not configured",
      };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${this.getUrl()}/identity`, {
        headers: {
          "X-Plex-Token": token,
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
          message: `Plex Server Online (${latencyMs}ms)`,
        };
      }

      if (res.status === 401) {
        return {
          status: "FAILED",
          latencyMs,
          message: "Plex Authentication Failed: Invalid Token",
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `Plex returned status ${res.status}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: "FAILED",
        latencyMs,
        message: err.name === "AbortError" ? "Plex connection timed out (4s)" : err.message,
      };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;

    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "plex");

    if (!source) return null;

    const mediaId = source.providerMediaId;
    const token = this.getToken();
    const url = mediaId.startsWith("http")
      ? mediaId
      : `${this.getUrl()}/video/:/transcode/universal/start.m3u8?path=${encodeURIComponent(mediaId)}&X-Plex-Token=${token}`;

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
      serverLabel: "Plex (Self-Hosted)",
      statusText: "Plex — Direct Stream",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
