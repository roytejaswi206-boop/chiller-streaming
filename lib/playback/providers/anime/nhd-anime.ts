/**
 * lib/playback/providers/anime/nhd-anime.ts
 *
 * NHD Anime Provider Adapter — Priority 1 in ANIME PLAYBACK POOL
 *
 * Dedicated integration for Anime playback using canonical AniList ID.
 * Direct endpoint: https://nhdapi.st/anime/${anilistId}/${episode}
 * Supports Sub / Dub switching and auto-failover.
 */

import {
  PlaybackProvider,
  PlaybackSource,
  PlaybackCandidate,
  PlaybackRequest,
  AnimePlaybackRequest,
  ProviderCapabilities,
  ProviderHealth,
  ProviderHealthStatus,
  PlaybackPool,
} from "../../types";
import { providerHealthCache } from "../../health-cache";

export class NHDAnimeProvider implements PlaybackProvider {
  id = "nhd-anime";
  name = "NHD Anime";
  enabled = process.env.NHD_ENABLED !== "false";
  pools: PlaybackPool[] = ["ANIME"];
  priority = 1;
  requiresApiKey = false;
  supportsMovie = false;
  supportsTV = false;
  supportsAnime = true;

  private getBaseUrl(): string {
    return (process.env.NHD_API_URL?.trim() || "https://nhdapi.st").replace(/\/+$/, "");
  }

  private getApiKey(): string {
    return process.env.NHD_API_KEY?.trim() || "";
  }

  private withKey(url: string): string {
    const key = this.getApiKey();
    if (!key) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}key=${encodeURIComponent(key)}`;
  }

  supports(request: PlaybackRequest): boolean {
    if (!this.enabled) return false;
    // Only accept anime requests with an AniList ID
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
      supportsNextEpisode: true,
      supportsSeekAfterLoad: true,
      supportsResumeAfterSwitch: true,
      controlLevel: "PARTIAL_CONTROL",
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
      return { status: "DISABLED", message: "NHD Anime is disabled" };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${this.getBaseUrl()}/anime/16498/1`, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      return {
        status: res.ok || res.status === 200 || res.status === 302 ? "ACTIVE" : "DEGRADED",
        latencyMs,
        message: `NHD Anime endpoint responsive (${latencyMs}ms)`,
      };
    } catch (err: any) {
      return {
        status: "DEGRADED",
        latencyMs: Date.now() - start,
        message: err.message || "NHD Anime probe timed out",
      };
    }
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
    const anilistId = String(request.anilistId).trim();
    const episode = Math.max(1, request.episode || 1);
    if (!anilistId) return null;

    const isDub = request.variant === "dub" || request.language === "dub" || request.preferredAudio === "en";
    const params = new URLSearchParams();
    if (isDub) params.set("dub", "1");
    if (request.resumeTime && request.resumeTime > 0) {
      params.set("t", String(Math.floor(request.resumeTime)));
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    const rawUrl = `${this.getBaseUrl()}/anime/${anilistId}/${episode}${query}`;
    const url = this.withKey(rawUrl);

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
      controlLevel: "PARTIAL_CONTROL",
      seekSupported: true,
      resumeSupported: true,
      quality: "HD 1080p",
      serverLabel: `Anime Core 1 (NHD ${isDub ? "DUB" : "SUB"})`,
      serverNumber: 1,
      statusText: `NHD Anime ${isDub ? "English Dub" : "Subtitled"} Stream — Ready`,
      progressTrackingSupported: true,
      status: "CANDIDATE_FOUND",
      verified: true,
    };
  }
}
