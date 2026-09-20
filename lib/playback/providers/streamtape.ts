/**
 * lib/playback/providers/streamtape.ts
 *
 * StreamTape Video Host Adapter
 * Reference: https://streamtape.com/login
 * API documentation: Official StreamTape API v1 (https://api.streamtape.com)
 *
 * Configuration:
 *   - STREAMTAPE_ENABLED=false (default)
 *   - STREAMTAPE_API_URL=https://api.streamtape.com
 *   - STREAMTAPE_API_LOGIN=
 *   - STREAMTAPE_API_KEY=
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

export class StreamTapeProvider implements PlaybackProvider {
  id = "streamtape";
  name = "StreamTape";
  enabled = process.env.STREAMTAPE_ENABLED === "true";
  priority = 12;
  requiresApiKey = true;

  private getApiUrl(): string {
    return (
      process.env.STREAMTAPE_API_URL?.trim() || "https://api.streamtape.com"
    ).replace(/\/+$/, "");
  }

  private getCredentials(): { login?: string; key?: string } {
    return {
      login: process.env.STREAMTAPE_API_LOGIN?.trim(),
      key: process.env.STREAMTAPE_API_KEY?.trim() || process.env.STREAMTAPE_API_TOKEN?.trim(),
    };
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
      return { status: "DISABLED", message: "STREAMTAPE_ENABLED is false" };
    }

    const { login, key } = this.getCredentials();
    if (!login || !key) {
      return {
        status: "NOT_CONFIGURED",
        message: "STREAMTAPE_API_LOGIN or STREAMTAPE_API_KEY not configured",
      };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(
        `${this.getApiUrl()}/account/info?login=${encodeURIComponent(login)}&key=${encodeURIComponent(key)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.status === 200) {
          return {
            status: "ACTIVE",
            latencyMs,
            message: `StreamTape API Online (${latencyMs}ms)`,
          };
        }
        return {
          status: "FAILED",
          latencyMs,
          message: `StreamTape Auth Failed: ${json?.msg || "Invalid credentials"}`,
        };
      }

      return {
        status: "DEGRADED",
        latencyMs,
        message: `StreamTape returned status ${res.status}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: "FAILED",
        latencyMs,
        message: err.name === "AbortError" ? "StreamTape request timed out (4s)" : err.message,
      };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;

    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "streamtape");

    if (!source) return null;

    const mediaId = source.providerMediaId;
    const url = mediaId.startsWith("http")
      ? mediaId
      : `https://streamtape.com/e/${mediaId}`;

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
      quality: source.quality || "720p/1080p",
      serverLabel: "StreamTape (Cloud)",
      statusText: "StreamTape — Ready",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
