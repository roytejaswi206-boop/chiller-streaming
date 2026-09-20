/**
 * lib/playback/providers/vidstreaming.ts
 *
 * VidStreaming Video Host Adapter
 * Reference: https://vidstreaming.org/
 *
 * Configuration:
 *   - VIDSTREAMING_ENABLED=false (default)
 *   - VIDSTREAMING_API_URL=
 *   - VIDSTREAMING_API_KEY=
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

export class VidStreamingProvider implements PlaybackProvider {
  id = "vidstreaming";
  name = "VidStreaming";
  enabled = process.env.VIDSTREAMING_ENABLED === "true";
  priority = 15;
  requiresApiKey = true;

  private getApiUrl(): string | undefined {
    return process.env.VIDSTREAMING_API_URL?.trim();
  }

  private getApiKey(): string | undefined {
    return process.env.VIDSTREAMING_API_KEY?.trim() || process.env.VIDSTREAMING_API_TOKEN?.trim();
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
      hasCaptions: false,
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
      return { status: "DISABLED", message: "VIDSTREAMING_ENABLED is false" };
    }

    const apiUrl = this.getApiUrl();
    if (!apiUrl) {
      return {
        status: "NOT_CONFIGURED",
        message: "VIDSTREAMING_API_URL is not configured",
      };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      return {
        status: res.ok ? "ACTIVE" : "DEGRADED",
        latencyMs,
        message: `VidStreaming endpoint status ${res.status} (${latencyMs}ms)`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: "FAILED",
        latencyMs,
        message: err.name === "AbortError" ? "VidStreaming timed out" : err.message,
      };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;

    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "vidstreaming");

    if (!source) return null;

    const mediaId = source.providerMediaId;
    const url = mediaId.startsWith("http")
      ? mediaId
      : `https://vidstreaming.org/e/${mediaId}`;

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
      quality: source.quality || "HD",
      serverLabel: "VidStreaming (Cloud)",
      statusText: "VidStreaming — Ready",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
