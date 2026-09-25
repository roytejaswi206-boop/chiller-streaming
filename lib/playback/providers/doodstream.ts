/**
 * lib/playback/providers/doodstream.ts
 *
 * DoodStream Video Host Adapter
 * Reference: https://doodstream.com / https://dood.so
 * Official API Documentation: https://doodapi.com
 *
 * Authentication: API Key (DOODSTREAM_API_KEY)
 * Security rule: Keep credentials strictly server-side. Never expose to client.
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

export class DoodStreamProvider implements PlaybackProvider {
  id = "doodstream";
  name = "DoodStream";
  enabled = process.env.DOODSTREAM_ENABLED === "true";
  priority = 13;
  requiresApiKey = true;

  private getApiUrl(): string {
    return (
      process.env.DOODSTREAM_API_URL?.trim() || "https://doodapi.com/api"
    ).replace(/\/+$/, "");
  }

  private getApiKey(): string | undefined {
    return process.env.DOODSTREAM_API_KEY?.trim();
  }

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    return Boolean(request.tmdbId || request.imdbId);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsMovie: true,
      supportsTV: true,
      supportsAnime: false,
      supportsSub: true,
      supportsDub: false,
      supportsEvents: false,
      requiresApiKey: true,
      hasCaptions: false,
      supportsIframe: true,
      supportsHLS: true,
      supportsMP4: true,
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
      return { status: "DISABLED", message: "DOODSTREAM_ENABLED is false" };
    }

    const key = this.getApiKey();
    if (!key) {
      return {
        status: "NOT_CONFIGURED",
        message: "DOODSTREAM_API_KEY is not configured",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.getApiUrl()}/account/info?key=${encodeURIComponent(key)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { status: "ACTIVE", latencyMs, message: "DoodStream API reachable" };
      }
      return { status: "DEGRADED", latencyMs, message: `DoodStream HTTP ${res.status}` };
    } catch (err: any) {
      return { status: "FAILED", latencyMs: Date.now() - start, message: err?.message || "DoodStream timeout" };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.enabled || !this.supports(request)) return null;

    try {
      const mappedRecords = await getActiveMappedSources(request);
      const doodRecord = mappedRecords.find(
        (r) => r.providerId === this.id || r.providerId.toLowerCase().includes("dood")
      );

      if (doodRecord) {
        const fileCode = doodRecord.providerMediaId;
        const embedUrl = fileCode.startsWith("http")
          ? fileCode
          : `https://dood.so/e/${fileCode}`;

        return {
          providerId: this.id,
          providerName: this.name,
          type: "embed",
          url: embedUrl,
          available: true,
          priority: this.priority,
          quality: "720p",
          mediaType: request.mediaType,
          tmdbId: request.tmdbId,
          season: request.season,
          episode: request.episode,
          language: request.language || "sub",
          status: "CANDIDATE_FOUND",
          serverLabel: `${this.name} Mirror`,
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}
