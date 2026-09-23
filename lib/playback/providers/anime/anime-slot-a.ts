/**
 * lib/playback/providers/anime/anime-slot-a.ts
 *
 * Configurable Anime Provider A Adapter
 * Environment variables:
 *   - ANIME_PROVIDER_A_ENABLED=false
 *   - ANIME_PROVIDER_A_API_URL=
 *   - ANIME_PROVIDER_A_API_KEY=
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

export class AnimeProviderA implements PlaybackProvider {
  id = "anime-provider-a";
  name = "Anime Server Alpha";
  enabled = process.env.ANIME_PROVIDER_A_ENABLED === "true";
  pools: PlaybackPool[] = ["ANIME"];
  priority = 2;
  requiresApiKey = false;
  supportsMovie = false;
  supportsTV = false;
  supportsAnime = true;

  private getBaseUrl(): string | undefined {
    return process.env.ANIME_PROVIDER_A_API_URL?.trim();
  }

  private getApiKey(): string | undefined {
    return process.env.ANIME_PROVIDER_A_API_KEY?.trim();
  }

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    return Boolean(request.mediaType === "anime" && (request.anilistId || request.malId));
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
      supportsEvents: false,
      requiresApiKey: Boolean(this.getApiKey()),
      hasCaptions: true,
      supportsMultipleAudio: true,
      supportsNextEpisode: true,
      supportsSeekAfterLoad: false,
      supportsResumeAfterSwitch: true,
      controlLevel: "EMBED_ONLY",
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
      return { status: "DISABLED", message: "ANIME_PROVIDER_A_ENABLED is false" };
    }
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      return { status: "NOT_CONFIGURED", message: "ANIME_PROVIDER_A_API_URL is missing" };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(baseUrl, { method: "HEAD", signal: controller.signal });
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      return {
        status: res.ok ? "ACTIVE" : "DEGRADED",
        latencyMs,
        message: `Anime Server Alpha endpoint responsive (${latencyMs}ms)`,
      };
    } catch (err: any) {
      return {
        status: "FAILED",
        latencyMs: Date.now() - start,
        message: err.message || "Connection failed",
      };
    }
  }

  async resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.supports(request) || !request.anilistId) return null;
    return this.resolveAnime({
      anilistId: request.anilistId,
      malId: request.malId,
      episode: request.episode || 1,
      language: request.language,
      variant: request.language as any,
      preferredAudio: request.preferredAudio,
    });
  }

  async resolveAnime(request: AnimePlaybackRequest): Promise<PlaybackCandidate | null> {
    if (!this.enabled) return null;
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) return null;

    const anilistId = String(request.anilistId).trim();
    const episode = Math.max(1, request.episode || 1);
    const isDub = request.variant === "dub" || request.language === "dub";
    const key = this.getApiKey();
    const keyParam = key ? `&key=${encodeURIComponent(key)}` : "";
    const langParam = isDub ? "&dub=1" : "";

    const url = `${baseUrl.replace(/\/+$/, "")}/embed/${anilistId}/${episode}?autoplay=1${langParam}${keyParam}`;

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
      anilistId,
      episode,
      language: isDub ? "dub" : "sub",
      variant: isDub ? "dub" : "sub",
      audioLanguage: isDub ? "en" : "ja",
      availableVariants: ["sub", "dub"],
      controlLevel: "EMBED_ONLY",
      seekSupported: false,
      resumeSupported: true,
      quality: "1080p",
      serverLabel: `Anime Alpha (${isDub ? "DUB" : "SUB"})`,
      serverNumber: 2,
      statusText: "Anime Server Alpha — Ready",
      progressTrackingSupported: false,
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
