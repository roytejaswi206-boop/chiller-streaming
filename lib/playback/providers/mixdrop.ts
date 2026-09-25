/**
 * lib/playback/providers/mixdrop.ts
 *
 * MixDrop Video Host Adapter
 * Reference: https://mixdrop.ag
 * Official API Documentation: https://mixdrop.ag/api
 *
 * Authentication: Email & API Key (MIXDROP_EMAIL, MIXDROP_API_KEY)
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

export class MixDropProvider implements PlaybackProvider {
  id = "mixdrop";
  name = "MixDrop";
  enabled = process.env.MIXDROP_ENABLED === "true";
  priority = 12;
  requiresApiKey = true;

  private getApiUrl(): string {
    return (
      process.env.MIXDROP_API_URL?.trim() || "https://mixdrop.ag/api"
    ).replace(/\/+$/, "");
  }

  private getCredentials(): { email?: string; key?: string } {
    return {
      email: process.env.MIXDROP_EMAIL?.trim(),
      key: process.env.MIXDROP_API_KEY?.trim(),
    };
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
      return { status: "DISABLED", message: "MIXDROP_ENABLED is false" };
    }

    const { email, key } = this.getCredentials();
    if (!email || !key) {
      return {
        status: "NOT_CONFIGURED",
        message: "MIXDROP_EMAIL or MIXDROP_API_KEY is not configured",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch(
        `${this.getApiUrl()}?email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(4000),
        }
      );

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { status: "ACTIVE", latencyMs, message: "MixDrop API reachable" };
      }
      return { status: "DEGRADED", latencyMs, message: `MixDrop HTTP ${res.status}` };
    } catch (err: any) {
      return { status: "FAILED", latencyMs: Date.now() - start, message: err?.message || "MixDrop timeout" };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.enabled || !this.supports(request)) return null;

    try {
      const mappedRecords = await getActiveMappedSources(request);
      const mixdropRecord = mappedRecords.find(
        (r) => r.providerId === this.id || r.providerId.toLowerCase().includes("mixdrop")
      );

      if (mixdropRecord) {
        const fileCode = mixdropRecord.providerMediaId;
        const embedUrl = fileCode.startsWith("http")
          ? fileCode
          : `https://mixdrop.ag/e/${fileCode}`;

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
