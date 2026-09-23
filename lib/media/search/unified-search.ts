/**
 * lib/media/search/unified-search.ts
 *
 * CHILLER PRODUCTION UNIFIED SEARCH ENGINE
 *
 * Provides:
 * - Multi-provider fanout: TMDB (Movies/TV), AniList (Anime), Jikan (MAL), Kitsu
 * - Abbreviation & synonym expansion (AoT, BNHA, JJK, OP, DBZ, etc.)
 * - Romaji, English, and Native title matching
 * - Strict media classification & canonical routing URLs
 * - Relevance ranking by similarity score & popularity
 * - In-flight deduplication and query caching
 */

import { searchMulti } from "@/lib/tmdb/client";
import { AniListContentProvider } from "@/lib/content/providers/anilist";
import { JikanContentProvider } from "@/lib/content/providers/jikan";
import { KitsuContentProvider } from "@/lib/content/providers/kitsu";
import { expandAbbreviations, calculateTitleSimilarity } from "@/lib/media/identity/title-matcher";
import { classifyMedia } from "@/lib/playback/media-classifier";

export interface UnifiedSearchResult {
  id: string | number;
  tmdbId?: number;
  anilistId?: number;
  malId?: number;
  title: string;
  originalTitle?: string;
  romajiTitle?: string;
  englishTitle?: string;
  mediaType: "movie" | "tv" | "anime";
  mediaClass: string;
  targetPool: "GENERAL" | "ANIME";
  posterUrl: string;
  backdropUrl?: string;
  year?: string;
  rating?: number;
  episodes?: number;
  status?: string;
  watchUrl: string;
  detailUrl: string;
  relevanceScore: number;
  source: string;
}

interface CacheItem {
  results: UnifiedSearchResult[];
  expiresAt: number;
}

const searchCache = new Map<string, CacheItem>();
const inFlightSearches = new Map<string, Promise<UnifiedSearchResult[]>>();
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class UnifiedSearchEngine {
  private anilist = new AniListContentProvider();
  private jikan = new JikanContentProvider();
  private kitsu = new KitsuContentProvider();

  async search(rawQuery: string, options: { type?: "all" | "movie" | "tv" | "anime"; limit?: number } = {}): Promise<UnifiedSearchResult[]> {
    const query = rawQuery.trim();
    if (!query) return [];

    const typeFilter = options.type || "all";
    const limit = options.limit || 24;
    const cacheKey = `${typeFilter}:${query.toLowerCase()}`;

    // 1. Check Cache
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.results.slice(0, limit);
    }

    // 2. Check In-Flight Deduplication
    const inFlight = inFlightSearches.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const searchPromise = this.executeSearch(query, typeFilter);
    inFlightSearches.set(cacheKey, searchPromise);

    try {
      const results = await searchPromise;
      searchCache.set(cacheKey, {
        results,
        expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
      });
      return results.slice(0, limit);
    } finally {
      inFlightSearches.delete(cacheKey);
    }
  }

  private async executeSearch(query: string, typeFilter: string): Promise<UnifiedSearchResult[]> {
    const expandedQueries = expandAbbreviations(query);
    const primaryQuery = expandedQueries[0] || query;
    const secondaryQuery = expandedQueries[1];

    const fetchPromises: Promise<any>[] = [];

    // Fan-out to TMDB for Movies and TV (if not strictly anime)
    if (typeFilter !== "anime") {
      fetchPromises.push(
        searchMulti(primaryQuery, 1).catch(() => ({ results: [] })),
        secondaryQuery ? searchMulti(secondaryQuery, 1).catch(() => ({ results: [] })) : Promise.resolve({ results: [] })
      );
    } else {
      fetchPromises.push(Promise.resolve({ results: [] }), Promise.resolve({ results: [] }));
    }

    // Fan-out to AniList for Anime (if not strictly movie/tv)
    if (typeFilter !== "movie" && typeFilter !== "tv") {
      fetchPromises.push(
        this.anilist.search(primaryQuery, 1, 15).catch(() => ({ items: [] })),
        secondaryQuery ? this.anilist.search(secondaryQuery, 1, 10).catch(() => ({ items: [] })) : Promise.resolve({ items: [] })
      );
      // Also probe Jikan for secondary anime coverage
      fetchPromises.push(
        this.jikan.search(primaryQuery).catch(() => [])
      );
    } else {
      fetchPromises.push(Promise.resolve({ items: [] }), Promise.resolve({ items: [] }), Promise.resolve([]));
    }

    const [tmdb1, tmdb2, ani1, ani2, jikanResults] = await Promise.all(fetchPromises);

    const candidates: UnifiedSearchResult[] = [];
    const seenKeys = new Set<string>();

    const testQueries = Array.from(new Set([query, ...expandedQueries]));

    // Process AniList matches
    const aniItems = [...(ani1?.items || []), ...(ani2?.items || [])];
    for (const item of aniItems) {
      const anilistId = Number(item.externalIds?.anilistId || item.id?.replace?.(/\D/g, "") || 0);
      if (!anilistId) continue;

      const key = `anime:anilist:${anilistId}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const simScore = Math.max(
        ...testQueries.flatMap((q) => [
          calculateTitleSimilarity(q, item.title || ""),
          item.romajiTitle ? calculateTitleSimilarity(q, item.romajiTitle) : 0,
          item.englishTitle ? calculateTitleSimilarity(q, item.englishTitle) : 0,
        ])
      );

      candidates.push({
        id: anilistId,
        anilistId,
        malId: item.externalIds?.malId,
        title: item.title,
        originalTitle: item.originalTitle,
        romajiTitle: item.romajiTitle,
        englishTitle: item.englishTitle,
        mediaType: "anime",
        mediaClass: item.format === "MOVIE" ? "ANIME_MOVIE" : "ANIME",
        targetPool: "ANIME",
        posterUrl: item.posterUrl || "/placeholder-poster.png",
        backdropUrl: item.backdropUrl,
        year: item.year,
        rating: item.rating,
        episodes: item.totalEpisodes,
        status: item.status,
        watchUrl: `/watch/anime/${anilistId}/1`,
        detailUrl: `/anime/${anilistId}`,
        relevanceScore: simScore * 100 + (item.popularity ? Math.min(item.popularity / 500, 20) : 0),
        source: "AniList",
      });
    }

    // Process Jikan matches (if not already captured)
    if (Array.isArray(jikanResults)) {
      for (const item of jikanResults) {
        const malId = item.externalIds?.malId;
        if (!malId) continue;

        const titleKey = item.title?.toLowerCase().trim();
        if (Array.from(seenKeys).some((k) => k.includes(titleKey))) continue;

        const simScore = Math.max(
          ...testQueries.map((q) => calculateTitleSimilarity(q, item.title || ""))
        );
        candidates.push({
          id: `mal-${malId}`,
          malId,
          title: item.title,
          originalTitle: item.originalTitle,
          romajiTitle: item.romajiTitle,
          englishTitle: item.englishTitle,
          mediaType: "anime",
          mediaClass: "ANIME",
          targetPool: "ANIME",
          posterUrl: item.posterUrl || "/placeholder-poster.png",
          backdropUrl: item.backdropUrl,
          year: item.year,
          rating: item.rating,
          episodes: item.totalEpisodes,
          status: item.status,
          watchUrl: `/watch/anime/${malId}/1`,
          detailUrl: `/anime/${malId}`,
          relevanceScore: simScore * 95,
          source: "MyAnimeList",
        });
      }
    }

    // Process TMDB matches (Movies and TV)
    const tmdbItems = [...(tmdb1?.results || []), ...(tmdb2?.results || [])];
    for (const item of tmdbItems) {
      if (!item.id || item.media_type === "person") continue;

      const title = item.title || item.name || "Untitled";
      const mediaType = item.media_type === "tv" ? "tv" : "movie";
      const key = `${mediaType}:tmdb:${item.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      // Check if TMDB item is actually Japanese anime
      const classification = classifyMedia({
        mediaType,
        tmdbId: item.id,
        title,
        genres: (item.genre_ids || []).map(String),
        country: item.origin_country?.[0],
        originalLanguage: item.original_language,
      });

      const simScore = Math.max(
        ...testQueries.map((q) => calculateTitleSimilarity(q, title))
      );
      const isAnime = classification.targetPool === "ANIME";

      candidates.push({
        id: item.id,
        tmdbId: item.id,
        title,
        originalTitle: item.original_title || item.original_name,
        mediaType: isAnime ? "anime" : mediaType,
        mediaClass: classification.mediaClass,
        targetPool: classification.targetPool,
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "/placeholder-poster.png",
        backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : undefined,
        year: (item.release_date || item.first_air_date || "").split("-")[0] || "",
        rating: Number((item.vote_average || 0).toFixed(1)),
        watchUrl: isAnime
          ? `/watch/anime/${item.id}/1`
          : mediaType === "tv"
          ? `/watch/tv/${item.id}/1/1`
          : `/watch/movie/${item.id}`,
        detailUrl: isAnime ? `/anime/${item.id}` : mediaType === "tv" ? `/series/${item.id}` : `/movie/${item.id}`,
        relevanceScore: simScore * 100 + (item.popularity ? Math.min(item.popularity / 100, 25) : 0),
        source: "TMDB",
      });
    }

    // Sort by relevance score descending
    candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return candidates;
  }
}

export const unifiedSearch = new UnifiedSearchEngine();
