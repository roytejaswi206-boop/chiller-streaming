/**
 * lib/playback/providers/earnvids.ts
 *
 * EarnVids Video Host / Video Service Adapter
 * Reference: https://earnvids.com/dashboard
 *
 * Notice: The reference URL is a user dashboard/login URL, not a public REST API.
 * In accordance with the CHILLER Architecture rules:
 * - Do NOT reverse engineer private endpoints.
 * - Default status is NOT CONFIGURED / DISABLED until verified API credentials are provided.
 *
 * Configuration:
 *   - EARNVIDS_ENABLED=false (default)
 *   - EARNVIDS_API_URL=
 *   - EARNVIDS_API_KEY=
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

export class EarnVidsProvider implements PlaybackProvider {
  id = "earnvids";
  name = "EarnVids";
  enabled = process.env.EARNVIDS_ENABLED === "true";
  priority = 13;
  requiresApiKey = true;

  private getApiUrl(): string | undefined {
    return process.env.EARNVIDS_API_URL?.trim();
  }

  private getApiKey(): string | undefined {
    return process.env.EARNVIDS_API_KEY?.trim() || process.env.EARNVIDS_API_TOKEN?.trim();
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
      return { status: "DISABLED", message: "EARNVIDS_ENABLED is false" };
    }

    const apiUrl = this.getApiUrl();
    const apiKey = this.getApiKey();

    if (!apiUrl || !apiKey) {
      return {
        status: "NOT_CONFIGURED",
        message: "EARNVIDS_API_URL or EARNVIDS_API_KEY not configured",
      };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${apiUrl}/account/info?key=${encodeURIComponent(apiKey)}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (res.ok) {
        return {
          status: "ACTIVE",
          latencyMs,
          message: `EarnVids API Online (${latencyMs}ms)`,
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `EarnVids returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: "FAILED",
        latencyMs,
        message: err.name === "AbortError" ? "EarnVids timed out" : err.message,
      };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;

    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "earnvids");

    if (!source) return null;

    const mediaId = source.providerMediaId;
    const url = mediaId.startsWith("http")
      ? mediaId
      : `https://earnvids.com/e/${mediaId}`;

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
      serverLabel: "EarnVids (Cloud)",
      statusText: "EarnVids — Ready",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
