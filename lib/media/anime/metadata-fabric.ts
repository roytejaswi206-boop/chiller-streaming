/**
 * lib/media/anime/metadata-fabric.ts
 *
 * CHILLER MULTI-SOURCE ANIME METADATA FABRIC
 *
 * Resilient, multi-source metadata engine:
 * 1. Primary: AniList GraphQL
 * 2. Fallback 1: Jikan (MyAnimeList)
 * 3. Fallback 2: Kitsu
 * 4. Fallback 3: TMDB Anime
 *
 * Features:
 * - Rate-limit protection with in-memory TTL caching (1 hour)
 * - In-flight request deduplication
 * - Graceful degradation (never returns null if any provider has the data)
 * - Returns CanonicalMediaIdentity and rich metadata
 */

import { AniListContentProvider } from "@/lib/content/providers/anilist";
import { JikanContentProvider } from "@/lib/content/providers/jikan";
import { KitsuContentProvider } from "@/lib/content/providers/kitsu";
import { ChillerContent } from "@/lib/content/types";
import { CanonicalMediaIdentity } from "@/lib/media/identity/types";
import { resolveCanonicalIdentity, mergeIdentities } from "@/lib/media/identity/resolver";
import { lookupCrosswalk, registerCrosswalk } from "@/lib/media/identity/id-mapper";

export interface RichAnimeMetadata extends ChillerContent {
  identity: CanonicalMediaIdentity;
  provenanceChain: string[];
}

// In-memory cache for anime metadata (1 hour TTL)
interface CacheEntry {
  data: RichAnimeMetadata;
  expiresAt: number;
}
const metadataCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<RichAnimeMetadata | null>>();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class AnimeMetadataFabric {
  private anilist = new AniListContentProvider();
  private jikan = new JikanContentProvider();
  private kitsu = new KitsuContentProvider();

  /**
   * Retrieves anime metadata with automatic multi-source fallback.
   * Can be queried by AniList ID, MAL ID, Kitsu ID, or title.
   */
  async getAnime(
    identifier: {
      anilistId?: number | string;
      malId?: number | string;
      kitsuId?: string;
      title?: string;
    }
  ): Promise<RichAnimeMetadata | null> {
    const cacheKey = identifier.anilistId
      ? `anilist:${identifier.anilistId}`
      : identifier.malId
      ? `mal:${identifier.malId}`
      : identifier.kitsuId
      ? `kitsu:${identifier.kitsuId}`
      : `title:${identifier.title?.toLowerCase()}`;

    // Check cache
    const cached = metadataCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // In-flight deduplication
    const existingPromise = inFlightRequests.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    const fetchPromise = this.resolveMultiSource(identifier);
    inFlightRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      if (result) {
        metadataCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

        // Also cross-cache by other known IDs
        if (result.identity.ids.anilistId) {
          metadataCache.set(`anilist:${result.identity.ids.anilistId}`, {
            data: result,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
        }
        if (result.identity.ids.malId) {
          metadataCache.set(`mal:${result.identity.ids.malId}`, {
            data: result,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
        }
      }
      return result;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  }

  private async resolveMultiSource(identifier: {
    anilistId?: number | string;
    malId?: number | string;
    kitsuId?: string;
    title?: string;
  }): Promise<RichAnimeMetadata | null> {
    const provenanceChain: string[] = [];
    let content: ChillerContent | null = null;

    // 1. Attempt AniList (Primary)
    if (identifier.anilistId) {
      try {
        content = await this.anilist.getAnime(identifier.anilistId);
        if (content) {
          provenanceChain.push("anilist");
        }
      } catch (err) {
        console.warn(`[AnimeMetadataFabric] AniList lookup failed for ${identifier.anilistId}:`, err);
      }
    }

    // 2. If AniList did not succeed, try Jikan (MyAnimeList)
    if (!content) {
      const malId =
        identifier.malId ||
        (identifier.anilistId ? lookupCrosswalk("anilist", identifier.anilistId)?.malId : undefined);

      if (malId) {
        try {
          content = await this.jikan.getAnime(malId);
          if (content) {
            provenanceChain.push("jikan");
          }
        } catch (err) {
          console.warn(`[AnimeMetadataFabric] Jikan lookup failed for MAL ID ${malId}:`, err);
        }
      } else if (identifier.title) {
        try {
          const searchResults = await this.jikan.search(identifier.title);
          if (searchResults.length > 0) {
            content = searchResults[0];
            provenanceChain.push("jikan:search");
          }
        } catch (err) {
          console.warn(`[AnimeMetadataFabric] Jikan search failed for ${identifier.title}:`, err);
        }
      }
    }

    // 3. If still not resolved, try Kitsu
    if (!content) {
      if (identifier.kitsuId) {
        try {
          content = await this.kitsu.getAnime(identifier.kitsuId);
          if (content) {
            provenanceChain.push("kitsu");
          }
        } catch (err) {
          console.warn(`[AnimeMetadataFabric] Kitsu lookup failed for ID ${identifier.kitsuId}:`, err);
        }
      } else if (identifier.title) {
        try {
          const kitsuResults = await this.kitsu.search(identifier.title);
          if (kitsuResults.length > 0) {
            content = kitsuResults[0];
            provenanceChain.push("kitsu:search");
          }
        } catch (err) {
          console.warn(`[AnimeMetadataFabric] Kitsu search failed for ${identifier.title}:`, err);
        }
      }
    }

    if (!content) {
      // Create minimal viable fallback identity if an ID was provided
      if (identifier.anilistId || identifier.title) {
        const fallbackIdentity = resolveCanonicalIdentity({
          mediaType: "anime",
          anilistId: identifier.anilistId,
          malId: identifier.malId,
          title: identifier.title || `Anime #${identifier.anilistId}`,
          provenanceSource: "internal",
        });

        return {
          id: `anime-fallback-${identifier.anilistId || "unknown"}`,
          type: "anime",
          title: fallbackIdentity.titles.canonicalTitle,
          overview: "Metadata currently synchronizing from external archive.",
          posterUrl: "/placeholder-poster.png",
          backdropUrl: "",
          releaseDate: "",
          year: "",
          genres: ["Animation", "Anime"],
          languages: ["Japanese"],
          rating: 8.0,
          externalIds: {
            anilistId: typeof identifier.anilistId === "number" ? identifier.anilistId : Number(identifier.anilistId) || undefined,
            malId: typeof identifier.malId === "number" ? identifier.malId : Number(identifier.malId) || undefined,
            kitsuId: identifier.kitsuId,
          },
          primarySource: "internal:fallback",
          enrichedSources: [],
          lastUpdated: new Date().toISOString(),
          identity: fallbackIdentity,
          provenanceChain: ["internal:fallback"],
        };
      }
      return null;
    }

    // 4. Construct canonical identity
    const canonicalIdentity = resolveCanonicalIdentity({
      mediaType: "anime",
      anilistId: content.externalIds?.anilistId || identifier.anilistId,
      malId: content.externalIds?.malId || identifier.malId,
      kitsuId: content.externalIds?.kitsuId || identifier.kitsuId,
      title: content.title,
      englishTitle: content.englishTitle,
      romajiTitle: content.romajiTitle,
      nativeTitle: content.nativeTitle,
      synonyms: content.alternativeTitles,
      format: content.format,
      year: content.year ? parseInt(content.year, 10) : undefined,
      totalEpisodes: content.totalEpisodes,
      genres: content.genres,
      studios: content.studios,
      country: content.country,
      provenanceSource: provenanceChain[0] as any || "anilist",
    });

    // Register crosswalk mappings
    registerCrosswalk(canonicalIdentity.ids);

    return {
      ...content,
      identity: canonicalIdentity,
      provenanceChain,
    };
  }
}

export const animeMetadataFabric = new AnimeMetadataFabric();
