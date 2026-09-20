/**
 * lib/playback/providers/platforms.ts
 *
 * Candidate Adapters for FAST / AVOD Platforms:
 * - Tubi (tubi)
 * - The Roku Channel (roku)
 * - Pluto TV (pluto)
 *
 * Strict Compliance:
 * - Only connect sources for content authorized to access, host, or embed.
 * - Kept feature-flagged (default: false) until authorized playback integrations/APIs are supplied.
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

export class TubiProvider implements PlaybackProvider {
  id = "tubi";
  name = "Tubi";
  enabled = process.env.TUBI_ENABLED === "true";
  priority = 25;

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    return Boolean(request.tmdbId || request.anilistId);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsMovie: true,
      supportsTV: true,
      supportsAnime: false,
      supportsSub: true,
      supportsDub: false,
      supportsEvents: false,
      requiresApiKey: false,
      hasCaptions: true,
    };
  }

  getHealth(): ProviderHealth {
    return providerHealthCache.getHealth(this.id);
  }

  async healthCheck(): Promise<{ status: ProviderHealthStatus; latencyMs?: number; message?: string }> {
    if (!this.enabled) return { status: "DISABLED", message: "TUBI_ENABLED is false" };
    return { status: "ACTIVE", message: "Tubi slot configured" };
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;
    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "tubi");
    if (!source) return null;

    const mediaId = source.providerMediaId;
    const url = mediaId.startsWith("http") ? mediaId : `https://tubitv.com/movies/${mediaId}`;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: request.mediaType,
      tmdbId: request.tmdbId,
      serverLabel: "Tubi (AVOD)",
      statusText: "Tubi — Ready",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}

export class RokuProvider implements PlaybackProvider {
  id = "roku";
  name = "The Roku Channel";
  enabled = process.env.ROKU_ENABLED === "true";
  priority = 26;

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    return Boolean(request.tmdbId || request.anilistId);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsMovie: true,
      supportsTV: true,
      supportsAnime: false,
      supportsSub: true,
      supportsDub: false,
      supportsEvents: false,
      requiresApiKey: false,
      hasCaptions: true,
    };
  }

  getHealth(): ProviderHealth {
    return providerHealthCache.getHealth(this.id);
  }

  async healthCheck(): Promise<{ status: ProviderHealthStatus; latencyMs?: number; message?: string }> {
    if (!this.enabled) return { status: "DISABLED", message: "ROKU_ENABLED is false" };
    return { status: "ACTIVE", message: "Roku slot configured" };
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;
    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "roku");
    if (!source) return null;

    const mediaId = source.providerMediaId;
    const url = mediaId.startsWith("http") ? mediaId : `https://therokuchannel.roku.com/details/${mediaId}`;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: request.mediaType,
      tmdbId: request.tmdbId,
      serverLabel: "Roku Channel",
      statusText: "Roku — Ready",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}

export class PlutoProvider implements PlaybackProvider {
  id = "pluto";
  name = "Pluto TV";
  enabled = process.env.PLUTO_ENABLED === "true";
  priority = 27;

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    return Boolean(request.tmdbId || request.anilistId);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsMovie: true,
      supportsTV: true,
      supportsAnime: false,
      supportsSub: true,
      supportsDub: false,
      supportsEvents: false,
      requiresApiKey: false,
      hasCaptions: true,
    };
  }

  getHealth(): ProviderHealth {
    return providerHealthCache.getHealth(this.id);
  }

  async healthCheck(): Promise<{ status: ProviderHealthStatus; latencyMs?: number; message?: string }> {
    if (!this.enabled) return { status: "DISABLED", message: "PLUTO_ENABLED is false" };
    return { status: "ACTIVE", message: "Pluto TV slot configured" };
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;
    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "pluto");
    if (!source) return null;

    const mediaId = source.providerMediaId;
    const url = mediaId.startsWith("http") ? mediaId : `https://pluto.tv/on-demand/movies/${mediaId}`;

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: request.mediaType,
      tmdbId: request.tmdbId,
      serverLabel: "Pluto TV",
      statusText: "Pluto TV — Ready",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
