import { PlaybackProvider, PlaybackRequest, ProviderHealth, ProviderHealthStatus } from "./types";
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
import { providerHealthCache } from "./health-cache";

/**
 * CHILLER CENTRALIZED PLAYBACK PROVIDER REGISTRY
 *
 * All providers implement the standardized PlaybackProvider interface:
 *   - supports(request)
 *   - resolve(request)
 *   - getCapabilities()
 *   - getHealth()
 *   - healthCheck()
 *
 * Independent failure boundaries: A failure of one provider never breaks another.
 */
class ProviderRegistry {
  private providers: Map<string, PlaybackProvider> = new Map();

  constructor() {
    // 1. Primary automated resolvers
    this.register(new CineSrcProvider());
    this.register(new VidSrcProvider());
    this.register(new VidkingProvider());
    this.register(new CodeSpecterProvider());
    this.register(new AggregatorProvider());
    this.register(new NHDProvider());

    // 2. Video Hosts & Media Services (FileMoon, VdoHide, StreamTape, EarnVids, Vidstream, VidStreaming)
    this.register(new FileMoonProvider());
    this.register(new VdoHideProvider());
    this.register(new StreamTapeProvider());
    this.register(new EarnVidsProvider());
    this.register(new VidstreamProvider());
    this.register(new VidStreamingProvider());

    // 3. Official Platform Integrations (Dailymotion)
    this.register(new DailymotionProvider());

    // 4. Self-Hosted Media Servers (Jellyfin, Plex)
    this.register(new JellyfinProvider());
    this.register(new PlexProvider());

    // 5. Cloud Media Platforms & Fast Channels (MyCloud, MegaCloud, MegaUp, Tubi, Roku, Pluto)
    this.register(new MyCloudProvider());
    this.register(new MegaCloudProvider());
    this.register(new MegaUpProvider());
    this.register(new TubiProvider());
    this.register(new RokuProvider());
    this.register(new PlutoProvider());
  }

  register(provider: PlaybackProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): PlaybackProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): PlaybackProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);
  }

  getEnabledProviders(): PlaybackProvider[] {
    return this.getAllProviders().filter((p) => p.enabled);
  }

  /**
   * Ranks providers for a given request based on dynamic score and priority.
   * Ranking determines candidate order without blocking concurrent execution.
   */
  rankProviders(request: PlaybackRequest): PlaybackProvider[] {
    const eligible = this.getEnabledProviders().filter((p) => p.supports(request));
    return eligible.sort((a, b) => {
      const scoreA = providerHealthCache.calculateScore(a.id, {
        mediaType: request.mediaType,
        language: request.language,
        hasLanguageSupport: request.language === "dub" ? a.getCapabilities().supportsDub : true,
      });
      const scoreB = providerHealthCache.calculateScore(b.id, {
        mediaType: request.mediaType,
        language: request.language,
        hasLanguageSupport: request.language === "dub" ? b.getCapabilities().supportsDub : true,
      });
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.priority - b.priority;
    });
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
      ? ([this.providers.get(providerId)].filter(Boolean) as PlaybackProvider[])
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
