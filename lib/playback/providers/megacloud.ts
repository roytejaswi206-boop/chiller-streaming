/**
 * lib/playback/providers/megacloud.ts
 *
 * MegaCloud Provider Adapter
 * Configuration:
 *   - MEGACLOUD_ENABLED=false (default)
 *   - MEGACLOUD_API_URL=
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

export class MegaCloudProvider implements PlaybackProvider {
  id = "megacloud";
  name = "MegaCloud";
  enabled = process.env.MEGACLOUD_ENABLED === "true";
  priority = 21;

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
      supportsDub: true,
      supportsEvents: false,
      requiresApiKey: false,
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
      return { status: "DISABLED", message: "MEGACLOUD_ENABLED is false" };
    }
    return { status: "ACTIVE", message: "MegaCloud slot configured" };
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request)) return null;

    const mapped = await getActiveMappedSources(request);
    const source = mapped.find((m) => m.providerId.toLowerCase() === "megacloud");

    if (!source) return null;

    const mediaId = source.providerMediaId;
    const url = mediaId.startsWith("http")
      ? mediaId
      : `https://megacloud.tv/embed/${mediaId}`;

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
      serverLabel: "MegaCloud",
      statusText: "MegaCloud — Ready",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
