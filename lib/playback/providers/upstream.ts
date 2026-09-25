/**
 * lib/playback/providers/upstream.ts
 *
 * UpStream Video Host Adapter
 * Reference: https://upstream.to
 * Official API Documentation: https://upstream.to/api
 *
 * Authentication: API Key (UPSTREAM_API_KEY)
 * Security rule: Keep credentials strictly server-side. Never expose to client.
 * Features:
 *   - /api/account/info health check
 *   - Mapped source resolution & direct embed: https://upstream.to/embed-{file_code}.html
 *   - Full support for Movies and TV shows
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

export class UpStreamProvider implements PlaybackProvider {
  id = "upstream";
  name = "UpStream";
  enabled = process.env.UPSTREAM_ENABLED === "true";
  priority = 11;
  requiresApiKey = true;

  private getApiUrl(): string {
    return (
      process.env.UPSTREAM_API_URL?.trim() || "https://upstream.to/api"
    ).replace(/\/+$/, "");
  }

  private getApiKey(): string | undefined {
    return process.env.UPSTREAM_API_KEY?.trim();
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
      hasCaptions: true,
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
      return { status: "DISABLED", message: "UPSTREAM_ENABLED is false" };
    }

    const key = this.getApiKey();
    if (!key) {
      return {
        status: "NOT_CONFIGURED",
        message: "UPSTREAM_API_KEY is not configured",
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
        return { status: "ACTIVE", latencyMs, message: "UpStream API active and reachable" };
      }
      return { status: "DEGRADED", latencyMs, message: `UpStream HTTP ${res.status}` };
    } catch (err: any) {
      return { status: "FAILED", latencyMs: Date.now() - start, message: err?.message || "UpStream timeout" };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.enabled || !this.supports(request)) return null;

    try {
      // 1. Check if an active mapped source exists in database for this title
      const mappedRecords = await getActiveMappedSources(request);
      const upstreamRecord = mappedRecords.find(
        (r) => r.providerId === this.id || r.providerId.toLowerCase().includes("upstream")
      );

      if (upstreamRecord) {
        const fileCode = upstreamRecord.providerMediaId;
        const embedUrl = fileCode.startsWith("http")
          ? fileCode
          : `https://upstream.to/embed-${fileCode}.html`;

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
