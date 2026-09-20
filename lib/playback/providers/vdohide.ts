/**
 * lib/playback/providers/vdohide.ts
 *
 * VdoHide Video Host / HLS Video Service Adapter
 * Reference: https://vdohide.com/
 *
 * Capabilities:
 *   - HLS streaming
 *   - Unlimited bandwidth embeds
 *   - Quality & subtitles
 * Configuration:
 *   - VDOHIDE_ENABLED=false (default)
 *   - VDOHIDE_API_URL=https://vdohide.com/api
 *   - VDOHIDE_API_KEY=
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

export class VdoHideProvider implements PlaybackProvider {
  id = "vdohide";
  name = "VdoHide";
  enabled = process.env.VDOHIDE_ENABLED === "true";
  priority = 11;
  requiresApiKey = true;

  private getApiUrl(): string {
    return (
      process.env.VDOHIDE_API_URL?.trim() || "https://vdohide.com/api"
    ).replace(/\/+$/, "");
  }

  private getApiKey(): string | undefined {
    return process.env.VDOHIDE_API_KEY?.trim() || process.env.VDOHIDE_API_TOKEN?.trim();
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
      supportsEvents: false,
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
      return { status: "DISABLED", message: "VDOHIDE_ENABLED is false" };
    }

    const key = this.getApiKey();
    if (!key) {
      return {
        status: "NOT_CONFIGURED",
        message: "VDOHIDE_API_KEY is not configured",
      };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${this.getApiUrl()}/account/info?key=${encodeURIComponent(key)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (res.ok) {
        return {
          status: "ACTIVE",
          latencyMs,
          message: `VdoHide API Online (${latencyMs}ms)`,
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          status: "FAILED",
          latencyMs,
          message: "VdoHide Authentication Failed: Invalid API Key",
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `VdoHide returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: "FAILED",
        latencyMs,
        message: err.name === "AbortError" ? "VdoHide request timed out (4s)" : err.message,
      };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;

    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "vdohide");

    if (!source) return null;

    const mediaId = source.providerMediaId;
    const url = mediaId.startsWith("http") ? mediaId : `https://vdohide.com/e/${mediaId}`;
    const isHls = mediaId.includes(".m3u8") || source.format === "HLS";

    return {
      providerId: this.id,
      providerName: this.name,
      type: isHls ? "hls" : "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: request.mediaType,
      tmdbId: request.tmdbId,
      anilistId: request.anilistId,
      season: request.season,
      episode: request.episode,
      quality: source.quality || "1080p HD",
      serverLabel: "VdoHide (HLS/Fast)",
      statusText: "VdoHide — Ready",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
