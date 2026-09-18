import { ContentProvider, ContentProviderStatus } from "./types";
import { TmdbContentProvider } from "./providers/tmdb";
import { AniListContentProvider } from "./providers/anilist";
import { JikanContentProvider } from "./providers/jikan";
import { TVmazeContentProvider } from "./providers/tvmaze";
import { TheTVDBContentProvider } from "./providers/thetvdb";
import { WatchmodeAvailabilityProvider } from "./providers/watchmode";
import { openSubtitles } from "@/lib/subtitles/providers/opensubtitles";

class OpenSubtitlesContentAdapter implements ContentProvider {
  id = "opensubtitles";
  name = "OpenSubtitles";
  category = "subtitles" as const;
  enabled = openSubtitles.enabled;
  requiresApiKey = true;
  priority = 7;

  async search() {
    return [];
  }

  async healthCheck() {
    return openSubtitles.healthCheck();
  }
}

class ContentProviderRegistry {
  private providers: Map<string, ContentProvider> = new Map();

  constructor() {
    this.register(new TmdbContentProvider());
    this.register(new AniListContentProvider());
    this.register(new JikanContentProvider());
    this.register(new TVmazeContentProvider());
    this.register(new TheTVDBContentProvider());
    this.register(new WatchmodeAvailabilityProvider());
    this.register(new OpenSubtitlesContentAdapter());
  }

  register(provider: ContentProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): ContentProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): ContentProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);
  }

  getProvidersByCategory(category: "general" | "anime" | "tv" | "availability"): ContentProvider[] {
    return this.getAllProviders().filter((p) => p.category === category && p.enabled);
  }

  async runHealthChecks(): Promise<Record<string, { status: ContentProviderStatus; latencyMs?: number; message?: string }>> {
    const results: Record<string, { status: ContentProviderStatus; latencyMs?: number; message?: string }> = {};

    await Promise.allSettled(
      this.getAllProviders().map(async (provider) => {
        try {
          results[provider.id] = await provider.healthCheck();
        } catch (err: any) {
          results[provider.id] = {
            status: "FAILED",
            message: err.message || "Check error",
          };
        }
      })
    );

    return results;
  }
}

export const contentRegistry = new ContentProviderRegistry();
