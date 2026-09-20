/**
 * CHILLER CENTRALIZED CONTENT DISCOVERY ENGINE 2.0
 * Unified discovery across TMDB, AniList (primary for Anime), TVmaze, and regional catalogues.
 * Fully paginated, deduplicated, multi-tier cached, fault-tolerant.
 */

import {
  discoverMovies,
  discoverTV,
  getAiringTodayTV,
  getAnimeMovies,
  getNowPlayingMovies,
  getOnTheAirTV,
  getPopularAnime,
  getPopularMovies,
  getPopularTV,
  getTopRatedAnime,
  getTopRatedMovies,
  getTopRatedTV,
  getTrending,
  getUpcomingMovies,
  searchMulti,
  TmdbMediaItem,
} from "@/lib/tmdb/client";
import { getGenreNames, TMDB_GENRES } from "@/lib/tmdb/genres";
import { contentRegistry } from "./registry";
import { AniListContentProvider } from "./providers/anilist";
import { discoveryCache } from "./discovery-cache";
import { ChillerContent } from "./types";

export interface MediaItem {
  id: number | string;
  tmdbId?: number;
  anilistId?: number;
  malId?: number;
  imdbId?: string;
  type: "movie" | "tv" | "anime";
  title: string;
  originalTitle?: string;
  poster: string;
  backdrop: string;
  overview: string;
  releaseDate?: string;
  year?: string;
  rating: number;
  voteCount?: number;
  popularity?: number;
  genres: string[];
  language?: string;
  country?: string;
  runtime?: number;
  status?: string;
  badges?: string[];
  rankingNumber?: number;
}

export interface DiscoveryQuery {
  mediaType?: "all" | "movie" | "tv" | "anime";
  category?: string;
  genre?: string | number;
  language?: string;
  country?: string;
  sort?: string;
  page?: number;
  limit?: number;
  timeWindow?: "day" | "week";
  year?: number;
  format?: "TV" | "MOVIE" | "OVA" | "ONA" | "SPECIAL";
  query?: string;
}

export interface DiscoveryResponse {
  items: MediaItem[];
  page: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  provider: string;
  cacheSource?: "HIT" | "MISS" | "IN_FLIGHT_DEDUP";
  latencyMs?: number;
}

// Genre Slug to TMDB IDs mapping (movies and TV)
export const GENRE_SLUG_MAP: Record<string, { movie: number; tv: number; name: string }> = {
  action: { movie: 28, tv: 10759, name: "Action" },
  adventure: { movie: 12, tv: 10759, name: "Adventure" },
  animation: { movie: 16, tv: 16, name: "Animation" },
  comedy: { movie: 35, tv: 35, name: "Comedy" },
  crime: { movie: 80, tv: 80, name: "Crime" },
  documentary: { movie: 99, tv: 99, name: "Documentary" },
  drama: { movie: 18, tv: 18, name: "Drama" },
  family: { movie: 10751, tv: 10751, name: "Family" },
  fantasy: { movie: 14, tv: 10765, name: "Fantasy" },
  history: { movie: 36, tv: 18, name: "History" },
  horror: { movie: 27, tv: 9648, name: "Horror" },
  music: { movie: 10402, tv: 10402, name: "Music" },
  mystery: { movie: 9648, tv: 9648, name: "Mystery" },
  romance: { movie: 10749, tv: 10749, name: "Romance" },
  scifi: { movie: 878, tv: 10765, name: "Sci-Fi" },
  thriller: { movie: 53, tv: 9648, name: "Thriller" },
  war: { movie: 10752, tv: 10768, name: "War" },
  western: { movie: 37, tv: 37, name: "Western" },
};

/**
 * Deduplication Context across rails
 */
export function createDeduplicationContext() {
  const seenIds = new Set<string>();

  return {
    has(item: { id: number | string; type?: string; tmdbId?: number }): boolean {
      const key = item.tmdbId ? `tmdb:${item.tmdbId}` : `${item.type || "media"}:${item.id}`;
      return seenIds.has(key);
    },
    add(item: { id: number | string; type?: string; tmdbId?: number }): void {
      const key = item.tmdbId ? `tmdb:${item.tmdbId}` : `${item.type || "media"}:${item.id}`;
      seenIds.add(key);
    },
    filter<T extends { id: number | string; type?: string; tmdbId?: number }>(items: T[]): T[] {
      return items.filter((item) => {
        const key = item.tmdbId ? `tmdb:${item.tmdbId}` : `${item.type || "media"}:${item.id}`;
        if (seenIds.has(key)) return false;
        seenIds.add(key);
        return true;
      });
    },
    filterRailItems<T extends { id: number | string; type?: string; tmdbId?: number }>(_railId: string, items: T[]): T[] {
      return this.filter(items);
    },
  };
}

/**
 * Normalize TMDB item into MediaItem
 */
function normalizeTmdbToMediaItem(item: TmdbMediaItem, defaultType: "movie" | "tv" | "anime" = "movie", rankingIndex?: number): MediaItem {
  const isTV = item.media_type === "tv" || defaultType === "tv";
  const isAnime =
    defaultType === "anime" ||
    (isTV && (item as any).original_language === "ja" && item.genre_ids?.includes(16));
  const mediaType: "movie" | "tv" | "anime" = isAnime ? "anime" : isTV ? "tv" : "movie";

  const releaseDate = item.release_date || item.first_air_date || "";
  const year = releaseDate.split("-")[0] || undefined;
  const rating = Number((item.vote_average || 0).toFixed(1));

  const badges: string[] = [];
  if (item.popularity && item.popularity > 200) badges.push("#POPULAR");
  if (rating >= 8.0 && (item.vote_count || 0) > 100) badges.push("#TOPRATED");
  if (releaseDate) {
    const releaseTime = new Date(releaseDate).getTime();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (releaseTime > thirtyDaysAgo) badges.push("#NEWRELEASE");
  }

  return {
    id: item.id,
    tmdbId: item.id,
    type: mediaType,
    title: item.title || item.name || item.original_title || item.original_name || "Untitled",
    originalTitle: item.original_title || item.original_name,
    poster: item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : item.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
      : "/placeholder-poster.png",
    backdrop: item.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
      : item.poster_path
      ? `https://image.tmdb.org/t/p/w780${item.poster_path}`
      : "/placeholder-backdrop.png",
    overview: item.overview || "Discover unforgettable stories on Chiller.",
    releaseDate,
    year,
    rating,
    voteCount: item.vote_count,
    popularity: item.popularity,
    genres: item.genres ? item.genres.map((g) => g.name) : getGenreNames(item.genre_ids),
    language: (item as any).original_language,
    rankingNumber: rankingIndex !== undefined ? rankingIndex + 1 : undefined,
    badges: badges.length > 0 ? badges : undefined,
  };
}

/**
 * Normalize AniList content into MediaItem
 */
function normalizeAniListToMediaItem(content: ChillerContent, rankingIndex?: number): MediaItem {
  const badges: string[] = ["#ANIME"];
  if (content.rating && content.rating >= 8.0) badges.push("#TOPRATED");
  if (content.popularity && content.popularity > 10000) badges.push("#POPULAR");
  if (content.status === "RELEASING") badges.push("#AIRINGNOW");

  return {
    id: content.id,
    anilistId: content.externalIds?.anilistId || Number(content.id) || undefined,
    malId: content.externalIds?.malId,
    tmdbId: content.externalIds?.tmdbId,
    type: "anime",
    title: content.title,
    originalTitle: content.romajiTitle || content.originalTitle || content.nativeTitle,
    poster: content.posterUrl || content.backdropUrl || "/placeholder-poster.png",
    backdrop: content.backdropUrl || content.posterUrl || "/placeholder-backdrop.png",
    overview: content.overview || "Enter infinite worlds on Chiller Anime.",
    releaseDate: content.releaseDate,
    year: content.year,
    rating: Number(content.rating.toFixed(1)),
    popularity: content.popularity,
    genres: content.genres || ["Animation"],
    language: "ja",
    country: "JP",
    status: content.status,
    rankingNumber: rankingIndex !== undefined ? rankingIndex + 1 : undefined,
    badges,
  };
}

/**
 * Main Discovery Engine Execution
 */
export async function discoverContent(query: DiscoveryQuery): Promise<DiscoveryResponse> {
  const page = Math.max(1, query.page || 1);
  const cacheKey = discoveryCache.normalizeKey("discovery", {
    mediaType: query.mediaType,
    category: query.category,
    genre: query.genre,
    language: query.language,
    country: query.country,
    sort: query.sort,
    page,
    timeWindow: query.timeWindow,
    year: query.year,
    format: query.format,
    query: query.query,
  });

  const ttl = discoveryCache.getTtlSeconds(query.category);

  const { data, source, latencyMs } = await discoveryCache.getOrFetch(
    cacheKey,
    query.mediaType === "anime" ? "AniList" : "TMDB",
    ttl,
    async () => {
      // 1. Anime Discovery via AniList Primary Engine
      if (query.mediaType === "anime") {
        const anilist = contentRegistry.getProvider("anilist") as AniListContentProvider | undefined;
        if (anilist?.enabled) {
          try {
            let res: { items: ChillerContent[]; hasNextPage: boolean; total: number };

            if (query.query) {
              res = await anilist.search(query.query, page, 20);
            } else if (query.category === "trending" || query.category === "trending_anime") {
              res = await anilist.getTrending(page, 20);
            } else if (query.category === "top_rated") {
              res = await anilist.getTopRated(page, 20);
            } else if (query.category === "airing" || query.category === "currently_airing") {
              res = await anilist.getAiring(page, 20);
            } else if (query.format) {
              res = await anilist.getByFormat(query.format, page, 20);
            } else if (query.genre) {
              const genreName = typeof query.genre === "string" ? query.genre : "Action";
              res = await anilist.getByGenre(genreName, page, 20);
            } else {
              res = await anilist.getPopular(page, 20);
            }

            if (res.items.length > 0) {
              const totalPages = Math.ceil(res.total / 20) || 50;
              const items = res.items.map((item, idx) =>
                normalizeAniListToMediaItem(item, (page - 1) * 20 + idx)
              );

              return {
                items,
                page,
                totalPages: Math.min(totalPages, 500),
                totalResults: res.total,
                hasNextPage: res.hasNextPage,
                provider: "AniList",
              };
            }
          } catch (aniErr) {
            discoveryCache.recordFallback("anilist->tmdb");
          }
        }

        // Fallback to TMDB for Anime if AniList unconfigured or failed
        let tmdbRes;
        if (query.category === "top_rated") {
          tmdbRes = await getTopRatedAnime(page);
        } else if (query.category === "movies" || query.format === "MOVIE") {
          tmdbRes = await getAnimeMovies(page);
        } else {
          tmdbRes = await getPopularAnime(page);
        }

        return {
          items: tmdbRes.results.map((item, idx) =>
            normalizeTmdbToMediaItem(item, "anime", (page - 1) * 20 + idx)
          ),
          page: tmdbRes.page,
          totalPages: tmdbRes.total_pages,
          totalResults: tmdbRes.total_results,
          hasNextPage: tmdbRes.page < tmdbRes.total_pages,
          provider: "TMDB (Anime Fallback)",
        };
      }

      // 2. Multi-Search Query
      if (query.query?.trim()) {
        const searchRes = await searchMulti(query.query.trim(), page);
        const filtered = searchRes.results.filter((i) => i.media_type !== "person");
        return {
          items: filtered.map((item, idx) =>
            normalizeTmdbToMediaItem(item, (item.media_type as any) || "movie", (page - 1) * 20 + idx)
          ),
          page: searchRes.page,
          totalPages: searchRes.total_pages,
          totalResults: searchRes.total_results,
          hasNextPage: searchRes.page < searchRes.total_pages,
          provider: "TMDB (MultiSearch)",
        };
      }

      // 3. K-Drama Discovery (Strict Korean language + Origin country KR)
      if (query.category === "kdrama" || (query.language === "ko" && query.country === "KR")) {
        const kdramaRes = await discoverTV({
          with_original_language: "ko",
          with_origin_country: "KR",
          sort_by: query.sort || "popularity.desc",
          page,
        });

        return {
          items: kdramaRes.results.map((item, idx) => {
            const normalized = normalizeTmdbToMediaItem(item, "tv", (page - 1) * 20 + idx);
            normalized.badges = ["#KDRAMA", ...(normalized.badges || [])];
            return normalized;
          }),
          page: kdramaRes.page,
          totalPages: kdramaRes.total_pages,
          totalResults: kdramaRes.total_results,
          hasNextPage: kdramaRes.page < kdramaRes.total_pages,
          provider: "TMDB (K-Drama)",
        };
      }

      // 4. C-Drama Discovery (Strict Chinese language + Origin country CN)
      if (query.category === "cdrama" || (query.language === "zh" && query.country === "CN")) {
        const cdramaRes = await discoverTV({
          with_original_language: "zh",
          with_origin_country: "CN",
          sort_by: query.sort || "popularity.desc",
          page,
        });

        return {
          items: cdramaRes.results.map((item, idx) => {
            const normalized = normalizeTmdbToMediaItem(item, "tv", (page - 1) * 20 + idx);
            normalized.badges = ["#CDRAMA", ...(normalized.badges || [])];
            return normalized;
          }),
          page: cdramaRes.page,
          totalPages: cdramaRes.total_pages,
          totalResults: cdramaRes.total_results,
          hasNextPage: cdramaRes.page < cdramaRes.total_pages,
          provider: "TMDB (C-Drama)",
        };
      }

      // 5. Kids & Cartoons
      if (query.category === "kids" || query.category === "cartoons") {
        const kidsRes =
          query.mediaType === "movie"
            ? await discoverMovies({ with_genres: "10751,16", sort_by: "popularity.desc", page })
            : await discoverTV({ with_genres: "10762,16", sort_by: "popularity.desc", page });

        return {
          items: kidsRes.results.map((item, idx) => {
            const normalized = normalizeTmdbToMediaItem(item, query.mediaType === "movie" ? "movie" : "tv", (page - 1) * 20 + idx);
            normalized.badges = ["#KIDS", ...(normalized.badges || [])];
            return normalized;
          }),
          page: kidsRes.page,
          totalPages: kidsRes.total_pages,
          totalResults: kidsRes.total_results,
          hasNextPage: kidsRes.page < kidsRes.total_pages,
          provider: "TMDB (Kids)",
        };
      }

      // 6. Documentaries
      if (query.category === "documentaries" || query.category === "documentary") {
        const docRes =
          query.mediaType === "tv"
            ? await discoverTV({ with_genres: 99, sort_by: "popularity.desc", page })
            : await discoverMovies({ with_genres: 99, sort_by: "popularity.desc", page });

        return {
          items: docRes.results.map((item, idx) => {
            const normalized = normalizeTmdbToMediaItem(item, query.mediaType === "tv" ? "tv" : "movie", (page - 1) * 20 + idx);
            normalized.badges = ["#DOCUMENTARY", ...(normalized.badges || [])];
            return normalized;
          }),
          page: docRes.page,
          totalPages: docRes.total_pages,
          totalResults: docRes.total_results,
          hasNextPage: docRes.page < docRes.total_pages,
          provider: "TMDB (Documentary)",
        };
      }

      // 7. Specific Genre Discovery (e.g. action, scifi, horror, comedy, etc.)
      const genreSlug = String(query.genre || query.category || "").toLowerCase();
      if (GENRE_SLUG_MAP[genreSlug] || typeof query.genre === "number") {
        const genreInfo = GENRE_SLUG_MAP[genreSlug];
        const isMovieOnly = query.mediaType === "movie";
        const isTvOnly = query.mediaType === "tv";

        let tmdbRes;
        if (isMovieOnly) {
          const genreId = genreInfo?.movie || Number(query.genre);
          tmdbRes = await discoverMovies({ with_genres: genreId, sort_by: query.sort || "popularity.desc", page });
        } else if (isTvOnly) {
          const genreId = genreInfo?.tv || Number(query.genre);
          tmdbRes = await discoverTV({ with_genres: genreId, sort_by: query.sort || "popularity.desc", page });
        } else {
          // Combined: defaults to movies or TV based on category
          const genreId = genreInfo?.movie || Number(query.genre);
          tmdbRes = await discoverMovies({ with_genres: genreId, sort_by: query.sort || "popularity.desc", page });
        }

        return {
          items: tmdbRes.results.map((item, idx) =>
            normalizeTmdbToMediaItem(item, isTvOnly ? "tv" : "movie", (page - 1) * 20 + idx)
          ),
          page: tmdbRes.page,
          totalPages: tmdbRes.total_pages,
          totalResults: tmdbRes.total_results,
          hasNextPage: tmdbRes.page < tmdbRes.total_pages,
          provider: "TMDB (Genre)",
        };
      }

      // 8. Language Discovery (Hindi, French, Spanish, Japanese, Korean, etc.)
      if (query.language) {
        const langRes =
          query.mediaType === "tv"
            ? await discoverTV({ with_original_language: query.language, sort_by: query.sort || "popularity.desc", page })
            : await discoverMovies({ with_original_language: query.language, sort_by: query.sort || "popularity.desc", page });

        return {
          items: langRes.results.map((item, idx) =>
            normalizeTmdbToMediaItem(item, query.mediaType === "tv" ? "tv" : "movie", (page - 1) * 20 + idx)
          ),
          page: langRes.page,
          totalPages: langRes.total_pages,
          totalResults: langRes.total_results,
          hasNextPage: langRes.page < langRes.total_pages,
          provider: "TMDB (Language)",
        };
      }

      // 9. Standard Categories: Trending, Popular, Top Rated, Now Playing, Upcoming
      const cat = (query.category || "popular").toLowerCase();
      let tmdbRes;

      if (cat === "trending" || cat === "trending_movies" || cat === "trending_tv") {
        const tmType = cat === "trending_movies" ? "movie" : cat === "trending_tv" ? "tv" : query.mediaType === "tv" ? "tv" : query.mediaType === "movie" ? "movie" : "all";
        tmdbRes = await getTrending(tmType, query.timeWindow || "week", page);
      } else if (cat === "now_playing" || cat === "recent_releases" || cat === "new_releases") {
        tmdbRes = query.mediaType === "tv" ? await getOnTheAirTV(page) : await getNowPlayingMovies(page);
      } else if (cat === "upcoming" || cat === "coming_soon") {
        tmdbRes = query.mediaType === "tv" ? await getAiringTodayTV(page) : await getUpcomingMovies(page);
      } else if (cat === "top_rated") {
        tmdbRes = query.mediaType === "tv" ? await getTopRatedTV(page) : await getTopRatedMovies(page);
      } else {
        // Default to popular
        tmdbRes = query.mediaType === "tv" ? await getPopularTV(page) : await getPopularMovies(page);
      }

      return {
        items: tmdbRes.results.map((item, idx) =>
          normalizeTmdbToMediaItem(item, (query.mediaType as any) || (item.media_type as any) || "movie", (page - 1) * 20 + idx)
        ),
        page: tmdbRes.page,
        totalPages: tmdbRes.total_pages,
        totalResults: tmdbRes.total_results,
        hasNextPage: tmdbRes.page < tmdbRes.total_pages,
        provider: "TMDB",
      };
    }
  );

  return {
    ...data,
    cacheSource: source,
    latencyMs,
  };
}

export const discoverMedia = discoverContent;

