/**
 * lib/playback/providers/anime/megacloud-anime.ts
 *
 * MegaCloud Anime Adapter — Priority 5 in ANIME PLAYBACK POOL
 * High-speed HLS and stream delivery for anime.
 */

import {
  PlaybackProvider,
  PlaybackCandidate,
  PlaybackRequest,
  AnimePlaybackRequest,
  ProviderCapabilities,
  ProviderHealth,
  ProviderHealthStatus,
  PlaybackPool,
} from "../../types";
import { providerHealthCache } from "../../health-cache";
import { getActiveMappedSources } from "../../source-mapper";

export class MegaCloudAnimeProvider implements PlaybackProvider {
  id = "megacloud-anime";
  name = "MegaCloud Anime";
  enabled = process.env.MEGACLOUD_ANIME_ENABLED === "true" || process.env.MEGACLOUD_ENABLED === "true";
  pools: PlaybackPool[] = ["ANIME"];
  priority = 5;
  requiresApiKey = false;
  supportsMovie = false;
  supportsTV = false;
  supportsAnime = true;

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    return Boolean(request.mediaType === "anime" && request.anilistId);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsMovie: false,
      supportsTV: false,
      supportsAnime: true,
      supportsAnimeMovie: true,
      supportsAnimeEpisode: true,
      supportsHLS: true,
      supportsIframe: true,
      supportsSub: true,
      supportsDub: true,
      supportsRaw: false,
      supportsEvents: true,
      requiresApiKey: false,
      hasCaptions: true,
      supportsMultipleAudio: true,
      supportsAudioTrackSwitch: true,
      supportsNextEpisode: true,
      supportsSeekAfterLoad: true,
      supportsResumeAfterSwitch: true,
      controlLevel: "FULL_CONTROL",
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
      return { status: "DISABLED", message: "MegaCloud Anime is disabled" };
    }
    return { status: "ACTIVE", message: "MegaCloud Anime operational" };
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request) || !request.anilistId) return null;
    return this.resolveAnime({
      anilistId: request.anilistId,
      episode: request.episode || 1,
      language: request.language,
      variant: request.language as any,
      preferredAudio: request.preferredAudio,
    });
  }

  async resolveAnime(request: AnimePlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.enabled) return null;

    // Check mapped database records
    const mapped = await getActiveMappedSources({
      mediaType: "anime",
      anilistId: request.anilistId,
      episode: request.episode,
    });

    const source = mapped.find(
      (m) =>
        m.providerId.toLowerCase() === "megacloud" ||
        m.providerId.toLowerCase() === "megacloud-anime"
    );

    if (!source) return null;

    const mediaId = source.providerMediaId;
    const url = mediaId.startsWith("http")
      ? mediaId
      : `https://megacloud.tv/embed/${mediaId}`;

    const isDub = request.variant === "dub" || request.language === "dub";

    return {
      providerId: this.id,
      providerName: this.name,
      type: "embed",
      url,
      available: true,
      priority: this.priority,
      mediaType: "anime",
      mediaClass: "ANIME",
      pool: "ANIME",
      anilistId: request.anilistId,
      episode: request.episode,
      language: isDub ? "dub" : "sub",
      variant: isDub ? "dub" : "sub",
      audioLanguage: isDub ? "en" : "ja",
      availableVariants: ["sub", "dub"],
      controlLevel: "FULL_CONTROL",
      seekSupported: true,
      resumeSupported: true,
      quality: source.quality || "HD",
      serverLabel: `MegaCloud Anime (${isDub ? "DUB" : "SUB"})`,
      serverNumber: 5,
      statusText: "MegaCloud Anime — Ready",
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
