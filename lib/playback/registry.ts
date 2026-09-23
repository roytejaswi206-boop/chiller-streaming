import {
  PlaybackProvider,
  PlaybackRequest,
  AnimePlaybackRequest,
  ProviderHealth,
  ProviderHealthStatus,
  PlaybackPool,
} from "./types";

// ── General Playback Pool Providers ──
import { CineSrcProvider } from "./providers/cinesrc";
import { VidSrcProvider } from "./providers/vidsrc";
import { VidkingProvider } from "./providers/vidking";
import { CodeSpecterProvider } from "./providers/codespecter";
import { AggregatorProvider } from "./providers/aggregator";
import { NHDProvider } from "./providers/nhd";
import { FileMoonProvider } from "./providers/filemoon";
import { VdoHideProvider } from "./providers/vdohide";
import { StreamTapeProvider } from "./providers/streamtape";
import { EarnVidsProvider } from "./providers/earnvids";
import { VidstreamProvider } from "./providers/vidstream";
import { VidStreamingProvider } from "./providers/vidstreaming";
import { DailymotionProvider } from "./providers/dailymotion";
import { JellyfinProvider } from "./providers/jellyfin";
import { PlexProvider } from "./providers/plex";
import { MyCloudProvider } from "./providers/mycloud";
import { MegaCloudProvider } from "./providers/megacloud";
import { MegaUpProvider } from "./providers/megaup";
import { TubiProvider, RokuProvider, PlutoProvider } from "./providers/platforms";

// ── Anime Playback Pool Providers ──
import {
  NHDAnimeProvider,
  AnimeProviderA,
  AnimeProviderB,
  AnimeProviderC,
  MegaCloudAnimeProvider,
} from "./providers/anime";

import { providerHealthCache } from "./health-cache";

/**
 * CHILLER DUAL-POOL PLAYBACK REGISTRY
 *
 * Maintains two specialized, isolated provider pools:
 * 1. GENERAL_PLAYBACK_PROVIDERS (Movies, TV series, Documentaries)
 * 2. ANIME_PLAYBACK_PROVIDERS (Anime, Anime movies, OVAs, ONAs)
 *
 * Strict isolation: General providers are never queried for anime unless verified and in the ANIME pool.
 * Independent failure boundaries: A failure of one provider never affects another.
 */
class ProviderRegistry {
  private generalProviders: Map<string, PlaybackProvider> = new Map();
  private animeProviders: Map<string, PlaybackProvider> = new Map();
  private allProvidersMap: Map<string, PlaybackProvider> = new Map();

  constructor() {
    // ── 1. Register General Providers (POOL A) ──
    const generalList: PlaybackProvider[] = [
      new CineSrcProvider(),
      new VidSrcProvider(),
      new VidkingProvider(),
      new CodeSpecterProvider(),
      new AggregatorProvider(),
      new NHDProvider(),
      new FileMoonProvider(),
      new VdoHideProvider(),
      new StreamTapeProvider(),
      new EarnVidsProvider(),
      new VidstreamProvider(),
      new VidStreamingProvider(),
      new DailymotionProvider(),
      new JellyfinProvider(),
      new PlexProvider(),
      new MyCloudProvider(),
      new MegaCloudProvider(),
      new MegaUpProvider(),
      new TubiProvider(),
      new RokuProvider(),
      new PlutoProvider(),
    ];

    for (const p of generalList) {
      if (!p.pools || p.pools.length === 0) {
        p.pools = ["GENERAL"];
      }
      this.registerGeneral(p);
    }

    // ── 2. Register Dedicated Anime Providers (POOL B) ──
    const animeList: PlaybackProvider[] = [
      new NHDAnimeProvider(),
      new AnimeProviderA(),
      new AnimeProviderB(),
      new AnimeProviderC(),
      new MegaCloudAnimeProvider(),
    ];

    for (const p of animeList) {
      if (!p.pools || p.pools.length === 0) {
        p.pools = ["ANIME"];
      }
      this.registerAnime(p);
    }
  }

  registerGeneral(provider: PlaybackProvider) {
    this.generalProviders.set(provider.id, provider);
    this.allProvidersMap.set(provider.id, provider);
  }

  registerAnime(provider: PlaybackProvider) {
    this.animeProviders.set(provider.id, provider);
    this.allProvidersMap.set(provider.id, provider);
  }

  register(provider: PlaybackProvider) {
    const isAnime = provider.pools?.includes("ANIME") || provider.getCapabilities().supportsAnime;
    const isGeneral = provider.pools?.includes("GENERAL") || provider.getCapabilities().supportsMovie || provider.getCapabilities().supportsTV;

    if (isAnime) this.animeProviders.set(provider.id, provider);
    if (isGeneral) this.generalProviders.set(provider.id, provider);
    this.allProvidersMap.set(provider.id, provider);
  }

  getProvider(id: string): PlaybackProvider | undefined {
    return this.allProvidersMap.get(id);
  }

  getGeneralProvider(id: string): PlaybackProvider | undefined {
    return this.generalProviders.get(id);
  }

  getAnimeProvider(id: string): PlaybackProvider | undefined {
    return this.animeProviders.get(id);
  }

  getAllProviders(): PlaybackProvider[] {
    return Array.from(this.allProvidersMap.values()).sort((a, b) => a.priority - b.priority);
  }

  getGeneralProviders(): PlaybackProvider[] {
    return Array.from(this.generalProviders.values()).sort((a, b) => a.priority - b.priority);
  }

  getAnimeProviders(): PlaybackProvider[] {
    return Array.from(this.animeProviders.values()).sort((a, b) => a.priority - b.priority);
  }

  getEnabledGeneralProviders(): PlaybackProvider[] {
    return this.getGeneralProviders().filter((p) => p.enabled);
  }

  getEnabledAnimeProviders(): PlaybackProvider[] {
    return this.getAnimeProviders().filter((p) => p.enabled);
  }

  /**
   * Ranks providers for Anime playback.
   */
  rankAnimeProviders(request: AnimePlaybackRequest | PlaybackRequest): PlaybackProvider[] {
    const isDub = (request as any).variant === "dub" || request.language === "dub" || request.preferredAudio === "en";
    const isRaw = (request as any).variant === "raw";

    const eligible = this.getEnabledAnimeProviders().filter((p) => {
      const caps = p.getCapabilities();
      if (!caps.supportsAnime) return false;
      // If RAW explicitly requested, filter out providers that do not declare RAW support
      if (isRaw && !caps.supportsRaw) return false;
      // If DUB explicitly requested, filter out providers that do not declare DUB support
      if (isDub && !caps.supportsDub) return false;
      // If SUB requested, ensure SUB support
      if (!isDub && !isRaw && !caps.supportsSub) return false;

      return p.supports({
        mediaType: "anime",
        anilistId: request.anilistId,
        malId: request.malId,
        season: request.season,
        episode: request.episode,
        language: request.language,
        preferredAudio: request.preferredAudio,
      });
    });

    return eligible.sort((a, b) => {
      const scoreA = providerHealthCache.calculateScore(a.id, {
        mediaType: "anime",
        language: request.language,
        variant: (request as any).variant,
        hasLanguageSupport: isDub ? a.getCapabilities().supportsDub : a.getCapabilities().supportsSub,
      });
      const scoreB = providerHealthCache.calculateScore(b.id, {
        mediaType: "anime",
        language: request.language,
        variant: (request as any).variant,
        hasLanguageSupport: isDub ? b.getCapabilities().supportsDub : b.getCapabilities().supportsSub,
      });
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.priority - b.priority;
    });
  }

  /**
   * Ranks providers for General Movie/TV playback.
   * Strictly filters to general pool.
   */
  rankGeneralProviders(request: PlaybackRequest): PlaybackProvider[] {
    const eligible = this.getEnabledGeneralProviders().filter((p) => p.supports(request));
    return eligible.sort((a, b) => {
      const isEnglishReq = request.language === "dub" || request.preferredAudio === "en";
      const scoreA = providerHealthCache.calculateScore(a.id, {
        mediaType: request.mediaType,
        language: request.language,
        hasLanguageSupport: isEnglishReq ? a.getCapabilities().supportsDub : true,
      });
      const scoreB = providerHealthCache.calculateScore(b.id, {
        mediaType: request.mediaType,
        language: request.language,
        hasLanguageSupport: isEnglishReq ? b.getCapabilities().supportsDub : true,
      });
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.priority - b.priority;
    });
  }

  /**
   * Dual-pool ranking router:
   * Directs Anime requests to rankAnimeProviders, Movie/TV to rankGeneralProviders.
   */
  rankProviders(request: PlaybackRequest): PlaybackProvider[] {
    if (
      request.mediaClass === "ANIME" ||
      request.mediaClass === "ANIME_MOVIE" ||
      request.mediaType === "anime" ||
      request.targetPool === "ANIME"
    ) {
      return this.rankAnimeProviders(request);
    }
    return this.rankGeneralProviders(request);
  }

  recordSuccess(providerId: string, latencyMs?: number) {
    providerHealthCache.recordSuccess(providerId, latencyMs);
  }

  recordFailure(providerId: string, error?: string) {
    providerHealthCache.recordFailure(providerId, error);
  }

  getHealthStats(): Record<string, ProviderHealth> {
    const result: Record<string, ProviderHealth> = {};
    for (const p of this.getAllProviders()) {
      result[p.id] = providerHealthCache.getHealth(p.id);
    }
    return result;
  }

  async runHealthCheck(
    providerId?: string
  ): Promise<Record<string, { status: ProviderHealthStatus; latencyMs?: number; message?: string }>> {
    const targets = providerId
      ? ([this.allProvidersMap.get(providerId)].filter(Boolean) as PlaybackProvider[])
      : this.getAllProviders();

    const results: Record<string, { status: ProviderHealthStatus; latencyMs?: number; message?: string }> = {};

    await Promise.allSettled(
      targets.map(async (provider) => {
        try {
          const check = await provider.healthCheck();
          results[provider.id] = check;
        } catch (err: any) {
          results[provider.id] = {
            status: "DEGRADED",
            message: `Health probe error: ${err.message || "Unknown"}`,
          };
        }
      })
    );

    return results;
  }
}

export const playbackRegistry = new ProviderRegistry();
