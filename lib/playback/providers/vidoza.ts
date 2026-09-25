/**
 * lib/playback/providers/vidoza.ts
 *
 * Vidoza Video Host Adapter
 * Reference: https://vidoza.net
 * Official API Documentation: https://api.vidoza.net/v1
 *
 * Authentication: API Key (VIDOZA_API_KEY)
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

export class VidozaProvider implements PlaybackProvider {
  id = "vidoza";
  name = "Vidoza";
  enabled = process.env.VIDOZA_ENABLED === "true";
  priority = 14;
  requiresApiKey = true;

  private getApiUrl(): string {
    return (
      process.env.VIDOZA_API_URL?.trim() || "https://api.vidoza.net/v1"
    ).replace(/\/+$/, "");
  }

  private getApiKey(): string | undefined {
    return process.env.VIDOZA_API_KEY?.trim();
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
      return { status: "DISABLED", message: "VIDOZA_ENABLED is false" };
    }

    const key = this.getApiKey();
    if (!key) {
      return {
        status: "NOT_CONFIGURED",
        message: "VIDOZA_API_KEY is not configured",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.getApiUrl()}/account/info`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { status: "ACTIVE", latencyMs, message: "Vidoza API reachable" };
      }
      return { status: "DEGRADED", latencyMs, message: `Vidoza HTTP ${res.status}` };
    } catch (err: any) {
      return { status: "FAILED", latencyMs: Date.now() - start, message: err?.message || "Vidoza timeout" };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.enabled || !this.supports(request)) return null;

    try {
      const mappedRecords = await getActiveMappedSources(request);
      const vidozaRecord = mappedRecords.find(
        (r) => r.providerId === this.id || r.providerId.toLowerCase().includes("vidoza")
      );

      if (vidozaRecord) {
        const fileCode = vidozaRecord.providerMediaId;
        const embedUrl = fileCode.startsWith("http")
          ? fileCode
          : `https://vidoza.net/embed-${fileCode}.html`;

        return {
          providerId: this.id,
          providerName: this.name,
          type: "embed",
          url: embedUrl,
          available: true,
          priority: this.priority,
          quality: "1080p",
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
