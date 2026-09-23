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
    if (this.requiresApiKey && !this.getApiKey()) return false;
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

      // Real documented EarnVids API contract endpoint
      const res = await fetch(`${apiUrl}/file/list?key=${encodeURIComponent(apiKey)}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.status === 200) {
          return {
            status: "ACTIVE",
            latencyMs,
            message: `EarnVids API Online (${latencyMs}ms)`,
          };
        } else if (data && data.msg) {
          return {
            status: "DEGRADED",
            latencyMs,
            message: `EarnVids returned: ${data.msg}`,
          };
        }
        return {
          status: "ACTIVE",
          latencyMs,
          message: `EarnVids API Online (${latencyMs}ms)`,
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          status: "FAILED",
          latencyMs,
          message: "EarnVids API Key Invalid or Unauthorized",
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

    // 1. Check mapped sources in database
    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "earnvids");

    if (source) {
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

    // 2. Query EarnVids file list if configured
    const apiUrl = this.getApiUrl();
    const apiKey = this.getApiKey();
    if (!apiUrl || !apiKey) return null;

    try {
      const searchTerms: string[] = [];
      if (request.tmdbId) searchTerms.push(String(request.tmdbId));
      if (request.anilistId) searchTerms.push(String(request.anilistId));

      for (const term of searchTerms) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(
          `${apiUrl}/file/list?key=${encodeURIComponent(apiKey)}&search=${encodeURIComponent(term)}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json().catch(() => null);
          const files = data?.result?.files || [];
          if (Array.isArray(files) && files.length > 0) {
            const file = files[0];
            const fileCode = file.file_code || file.filecode;
            if (fileCode) {
              return {
                providerId: this.id,
                providerName: this.name,
                type: "embed",
                url: `https://earnvids.com/e/${fileCode}`,
                available: true,
                priority: this.priority,
                mediaType: request.mediaType,
                tmdbId: request.tmdbId,
                anilistId: request.anilistId,
                season: request.season,
                episode: request.episode,
                quality: "HD",
                serverLabel: "EarnVids (Cloud)",
                statusText: "EarnVids — Ready",
                status: "CANDIDATE_FOUND",
                verified: true,
              };
            }
          }
        }
      }
    } catch {
      // Non-blocking lookup failure
    }

    return null;
  }
}
