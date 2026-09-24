/**
 * CHILLER INTELLIGENT RECOMMENDATION & DISCOVERY ENGINE
 * 
 * Multi-signal, cross-provider content recommendation service for CHILLER:
 * - Supports Movie, TV Series, and Anime (AniList + TMDB + Jikan)
 * - Netflix-grade rails: Because You Watched, More Like This, Trending Now, Popular, Top Rated, New Releases
 * - Automatic cross-rail deduplication & canonical identity resolution
 * - Personalized recommendation blending for authenticated users & guest sessions
 * - Weighted scoring: Genre similarity (30%), Popularity (25%), Rating (25%), Recency (20%)
 * - Diagnostics telemetry for admin intelligence inspection
 */

import {
  getMovieDetails,
  getTVDetails,
  getTrending,
  getPopularMovies,
  getPopularTV,
  getPopularAnime,
  getTopRatedMovies,
  getTopRatedTV,
  getTopRatedAnime,
  getNowPlayingMovies,
  getAiringTodayTV,
  discoverMovies,
  discoverTV,
  TmdbMediaItem,
} from "@/lib/tmdb/client";
import { AniListContentProvider } from "@/lib/content/providers/anilist";
import { contentRegistry } from "@/lib/content/registry";
import { ChillerContent } from "@/lib/content/types";
import { discoveryCache } from "@/lib/content/discovery-cache";

export interface RecommendationItem {
  id: number | string;
  tmdbId?: number;
  anilistId?: number;
  title: string;
  originalTitle?: string;
  posterPath: string | null;
  backdropPath: string | null;
  mediaType: "movie" | "tv" | "anime";
  rating: number;
  releaseYear: string;
  genres: string[];
  overview?: string;
  popularity?: number;
  badges?: string[];
  rankingScore?: number;
  rankingReasons?: string[];
  provider?: string;
}

export interface RecommendationSection {
  id: string;
  title: string;
  subtitle?: string;
  items: RecommendationItem[];
  layout?: "poster" | "backdrop";
  seeAllHref?: string;
}

export interface RecommendationResult {
  sections: RecommendationSection[];
  primaryMedia?: {
    id: string | number;
    title: string;
    mediaType: "movie" | "tv" | "anime";
    genres: string[];
  };
  totalCount: number;
  dedupedCount: number;
  cached: boolean;
  generatedAt: string;
  diagnostics?: {
    candidateCount: number;
    crossProviderDeduplications: number;
    rankingWeights: Record<string, number>;
    sources: string[];
    personalizationApplied: boolean;
  };
}

export interface RecommendationParams {
  mediaType?: "movie" | "tv" | "anime";
  mediaId?: string | number;
  tmdbId?: number;
  anilistId?: number;
  title?: string;
  genres?: string[];
  limit?: number;
  section?: string;
  userId?: string;
  userHistory?: Array<{
    tmdbId?: number;
    anilistId?: number;
    title?: string;
    mediaType?: "movie" | "tv" | "anime";
    genres?: string[];
    rating?: number;
  }>;
  debug?: boolean;
}

// In-memory LRU recommendation cache (30 minutes for content-based, 5 minutes for personalized)
interface CacheEntry {
  data: RecommendationResult;
  expiresAt: number;
}
const recCache = new Map<string, CacheEntry>();

function normalizeTmdbToRecItem(
  item: TmdbMediaItem,
  type: "movie" | "tv" | "anime",
  score = 0,
  reasons: string[] = []
): RecommendationItem {
  const title = item.title || item.name || "Untitled";
  const rawDate = item.release_date || item.first_air_date || "";
  const year = rawDate ? rawDate.split("-")[0] : "";
  const poster = item.poster_path
    ? item.poster_path.startsWith("http")
      ? item.poster_path
      : `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : null;
  const backdrop = item.backdrop_path
    ? item.backdrop_path.startsWith("http")
      ? item.backdrop_path
      : `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
    : null;

  return {
    id: item.id,
    tmdbId: item.id,
    title,
    originalTitle: item.original_title || item.original_name,
    posterPath: poster,
    backdropPath: backdrop,
    mediaType: type,
    rating: Number(item.vote_average?.toFixed(1) || 0),
    releaseYear: year,
    genres: item.genres?.map((g) => g.name) || [],
    overview: item.overview || "",
    popularity: item.popularity || 0,
    badges: item.vote_average >= 8.0 ? ["★ HIGHLY RATED"] : undefined,
    rankingScore: Number(score.toFixed(2)),
    rankingReasons: reasons,
    provider: "TMDB",
  };
}

function normalizeAniListToRecItem(
  content: ChillerContent,
  score = 0,
  reasons: string[] = []
): RecommendationItem {
  const year = content.year ? String(content.year) : content.releaseDate ? content.releaseDate.split("-")[0] : "";
  const anilistId = typeof content.id === "number" ? content.id : parseInt(String(content.id).replace(/\D/g, ""), 10) || undefined;

  return {
    id: content.id,
    anilistId,
    title: content.title,
    originalTitle: content.romajiTitle || content.originalTitle || content.nativeTitle,
    posterPath: content.posterUrl || null,
    backdropPath: content.backdropUrl || null,
    mediaType: "anime",
    rating: Number(content.rating?.toFixed(1) || 0),
    releaseYear: year,
    genres: content.genres || ["Animation"],
    overview: content.overview || "",
    popularity: content.popularity || 0,
    badges: content.rating >= 8.0 ? ["★ TOP ANIME"] : ["ANIME"],
    rankingScore: Number(score.toFixed(2)),
    rankingReasons: reasons,
    provider: "AniList",
  };
}

// Canonical title key for deduplication
function getCanonicalKey(item: { title: string; releaseYear?: string }): string {
  const cleanTitle = item.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return `${cleanTitle}_${item.releaseYear || ""}`;
}

// Compute ranking score based on weighted signals
function calculateRelevanceScore(
  itemGenres: string[] = [],
  targetGenres: string[] = [],
  popularity = 0,
  voteAverage = 0,
  releaseYear = ""
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Genre Overlap (Weight: 35)
  if (targetGenres.length > 0 && itemGenres.length > 0) {
    const targetSet = new Set(targetGenres.map((g) => g.toLowerCase()));
    const matching = itemGenres.filter((g) => targetSet.has(g.toLowerCase()));
    if (matching.length > 0) {
      const genrePoints = Math.min(35, (matching.length / targetGenres.length) * 35);
      score += genrePoints;
      reasons.push(`${matching.length} matching genres (${matching.slice(0, 2).join(", ")})`);
    }
  }

  // 2. Rating Quality (Weight: 25)
  if (voteAverage > 0) {
    const ratingPoints = (Math.min(10, voteAverage) / 10) * 25;
    score += ratingPoints;
    if (voteAverage >= 7.5) {
      reasons.push(`High user rating (${voteAverage.toFixed(1)}/10)`);
    }
  }

  // 3. Popularity & Momentum (Weight: 25)
  if (popularity > 0) {
    const popPoints = Math.min(25, Math.log10(popularity + 1) * 8);
    score += popPoints;
    if (popularity > 50) {
      reasons.push("Trending popularity");
    }
  }

  // 4. Recency (Weight: 15)
  if (releaseYear) {
    const yearNum = parseInt(releaseYear, 10);
    const currentYear = new Date().getFullYear();
    if (!isNaN(yearNum)) {
      const age = Math.max(0, currentYear - yearNum);
      const recencyPoints = Math.max(0, 15 - age * 1.5);
      score += recencyPoints;
      if (age <= 2) {
        reasons.push("Recent release");
      }
    }
  }

  return { score, reasons };
}

/**
 * Fetch and construct comprehensive recommendations for a title or user
 */
export async function getRecommendations(params: RecommendationParams): Promise<RecommendationResult> {
  const {
    mediaType = "movie",
    mediaId,
    tmdbId,
    anilistId,
    title,
    genres = [],
    limit = 18,
    userId,
    userHistory = [],
    debug = false,
  } = params;

  // Cache Lookup
  const cacheKey = `rec:${mediaType}:${mediaId || tmdbId || anilistId || "home"}:${userId || "guest"}:${limit}`;
  const cached = recCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, cached: true };
  }

  const sections: RecommendationSection[] = [];
  const seenCanonicalKeys = new Set<string>();
  const seenIds = new Set<string>();
  let totalCandidates = 0;
  let dedupedCount = 0;
  const sourcesUsed = new Set<string>();

  // Filter out the active item being watched
  if (title) {
    seenCanonicalKeys.add(getCanonicalKey({ title }));
  }
  if (mediaId) seenIds.add(String(mediaId));
  if (tmdbId) seenIds.add(String(tmdbId));
  if (anilistId) seenIds.add(String(anilistId));

  const deduplicateAndAdd = (
    candidates: RecommendationItem[],
    targetLimit: number
  ): RecommendationItem[] => {
    const unique: RecommendationItem[] = [];
    for (const item of candidates) {
      totalCandidates++;
      const idKey = String(item.tmdbId || item.anilistId || item.id);
      const canonKey = getCanonicalKey(item);

      if (seenIds.has(idKey) || seenCanonicalKeys.has(canonKey)) {
        dedupedCount++;
        continue;
      }

      seenIds.add(idKey);
      seenCanonicalKeys.add(canonKey);
      unique.push(item);
      if (unique.length >= targetLimit) break;
    }
    return unique;
  };

  // ──────────────────────────────────────────────────────────────────
  // 1. ANIME RECOMMENDATIONS PIPELINE (AniList + TMDB Hybrid)
  // ──────────────────────────────────────────────────────────────────
  if (mediaType === "anime") {
    const anilist = contentRegistry.getProvider("anilist") as AniListContentProvider | undefined;
    sourcesUsed.add("AniList");

    // A. "Because You Watched [Anime Title]"
    let becauseYouWatchedItems: RecommendationItem[] = [];
    if (genres.length > 0 && anilist?.enabled) {
      try {
        const primaryGenre = genres[0] || "Action";
        const genreRes = await anilist.getByGenre(primaryGenre, 1, 24);
        if (genreRes.items.length > 0) {
          const scored = genreRes.items.map((item) => {
            const { score, reasons } = calculateRelevanceScore(
              item.genres,
              genres,
              item.popularity,
              item.rating,
              item.year ? String(item.year) : ""
            );
            return normalizeAniListToRecItem(item, score, reasons);
          });
          scored.sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));
          becauseYouWatchedItems = deduplicateAndAdd(scored, limit);
        }
      } catch {
        // Fallback
      }
    }

    if (becauseYouWatchedItems.length > 0) {
      sections.push({
        id: "because-you-watched",
        title: title ? `Because You Watched ${title}` : "Recommended For You",
        subtitle: genres.length > 0 ? `Based on ${genres.slice(0, 2).join(" & ")} and fan favorites` : undefined,
        items: becauseYouWatchedItems,
        layout: "poster",
      });
    }

    // B. "Trending Anime"
    try {
      if (anilist?.enabled) {
        const trendingRes = await anilist.getTrending(1, 24);
        const trendingItems = deduplicateAndAdd(
          trendingRes.items.map((i) => normalizeAniListToRecItem(i, 80, ["Trending on AniList"])),
          limit
        );
        if (trendingItems.length > 0) {
          sections.push({
            id: "trending-anime",
            title: "Trending Anime Now",
            subtitle: "Most watched by the community this week",
            items: trendingItems,
            layout: "poster",
            seeAllHref: "/anime?category=trending",
          });
        }
      }
    } catch {}

    // C. "Currently Airing / New Episodes"
    try {
      if (anilist?.enabled) {
        const airingRes = await anilist.getAiring(1, 24);
        const airingItems = deduplicateAndAdd(
          airingRes.items.map((i) => normalizeAniListToRecItem(i, 75, ["Airing this season"])),
          limit
        );
        if (airingItems.length > 0) {
          sections.push({
            id: "seasonal-airing",
            title: "Currently Airing & Simulcasts",
            subtitle: "Fresh episodes streaming this season",
            items: airingItems,
            layout: "poster",
            seeAllHref: "/anime?category=airing",
          });
        }
      }
    } catch {}

    // D. "Top Rated & Critically Acclaimed Anime"
    try {
      if (anilist?.enabled) {
        const topRes = await anilist.getTopRated(1, 24);
        const topItems = deduplicateAndAdd(
          topRes.items.map((i) => normalizeAniListToRecItem(i, 85, ["Top rated masterpiece"])),
          limit
        );
        if (topItems.length > 0) {
          sections.push({
            id: "top-rated-anime",
            title: "Critically Acclaimed Anime",
            subtitle: "Highest rated masterpieces of all time",
            items: topItems,
            layout: "poster",
            seeAllHref: "/anime?category=top_rated",
          });
        }
      }
    } catch {}
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. MOVIE RECOMMENDATIONS PIPELINE (TMDB Deep Similarity & Trends)
  // ──────────────────────────────────────────────────────────────────
  else if (mediaType === "movie") {
    sourcesUsed.add("TMDB");
    const activeTmdbId = tmdbId || (typeof mediaId === "number" ? mediaId : parseInt(String(mediaId), 10));

    // A. "Because You Watched [Movie Title]" (Appended Recommendations + Similar)
    if (activeTmdbId && !isNaN(activeTmdbId)) {
      try {
        const details = await getMovieDetails(activeTmdbId);
        const recResults = details.recommendations?.results || [];
        const simResults = details.similar?.results || [];
        const combined = [...recResults, ...simResults];

        if (combined.length > 0) {
          const scored = combined.map((item) => {
            const itemGenres = item.genres?.map((g) => g.name) || [];
            const { score, reasons } = calculateRelevanceScore(
              itemGenres,
              genres,
              item.popularity,
              item.vote_average,
              item.release_date?.split("-")[0]
            );
            return normalizeTmdbToRecItem(item, "movie", score, reasons);
          });
          scored.sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));
          const recItems = deduplicateAndAdd(scored, limit);

          if (recItems.length > 0) {
            sections.push({
              id: "because-you-watched",
              title: title ? `Because You Watched ${title}` : "More Like This",
              subtitle: genres.length > 0 ? `Themes: ${genres.slice(0, 3).join(", ")}` : undefined,
              items: recItems,
              layout: "poster",
            });
          }
        }
      } catch {}
    }

    // B. "Trending Movies This Week"
    try {
      const trendingRes = await getTrending("movie", "week");
      const trendingItems = deduplicateAndAdd(
        trendingRes.results.map((i) => normalizeTmdbToRecItem(i, "movie", 80, ["Trending globally"])),
        limit
      );
      if (trendingItems.length > 0) {
        sections.push({
          id: "trending-movies",
          title: "Trending Movies",
          subtitle: "What everyone is streaming right now",
          items: trendingItems,
          layout: "poster",
          seeAllHref: "/movies",
        });
      }
    } catch {}

    // C. "New Releases" (Now Playing in Theaters / Digital)
    try {
      const newRes = await getNowPlayingMovies(1);
      const newItems = deduplicateAndAdd(
        newRes.results.map((i) => normalizeTmdbToRecItem(i, "movie", 75, ["Newly released"])),
        limit
      );
      if (newItems.length > 0) {
        sections.push({
          id: "new-releases",
          title: "New Releases",
          subtitle: "Latest cinematic additions on CHILLER",
          items: newItems,
          layout: "poster",
          seeAllHref: "/movies",
        });
      }
    } catch {}

    // D. "Critically Acclaimed / Top Rated"
    try {
      const topRes = await getTopRatedMovies(1);
      const topItems = deduplicateAndAdd(
        topRes.results.map((i) => normalizeTmdbToRecItem(i, "movie", 90, ["Top rated critical acclaim"])),
        limit
      );
      if (topItems.length > 0) {
        sections.push({
          id: "top-rated-movies",
          title: "Critically Acclaimed",
          subtitle: "Certified crowd favorites and award winners",
          items: topItems,
          layout: "poster",
          seeAllHref: "/movies",
        });
      }
    } catch {}
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. TV SERIES RECOMMENDATIONS PIPELINE (TMDB Episodic Fabric)
  // ──────────────────────────────────────────────────────────────────
  else if (mediaType === "tv") {
    sourcesUsed.add("TMDB");
    const activeTmdbId = tmdbId || (typeof mediaId === "number" ? mediaId : parseInt(String(mediaId), 10));

    // A. "Because You Watched [Series Title]"
    if (activeTmdbId && !isNaN(activeTmdbId)) {
      try {
        const details = await getTVDetails(activeTmdbId);
        const recResults = details.recommendations?.results || [];
        const simResults = details.similar?.results || [];
        const combined = [...recResults, ...simResults];

        if (combined.length > 0) {
          const scored = combined.map((item) => {
            const itemGenres = item.genres?.map((g) => g.name) || [];
            const { score, reasons } = calculateRelevanceScore(
              itemGenres,
              genres,
              item.popularity,
              item.vote_average,
              item.first_air_date?.split("-")[0]
            );
            return normalizeTmdbToRecItem(item, "tv", score, reasons);
          });
          scored.sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));
          const tvRecItems = deduplicateAndAdd(scored, limit);

          if (tvRecItems.length > 0) {
            sections.push({
              id: "because-you-watched",
              title: title ? `Because You Watched ${title}` : "Similar Series",
              subtitle: genres.length > 0 ? `Fans also loved ${genres.slice(0, 2).join(" & ")}` : undefined,
              items: tvRecItems,
              layout: "poster",
            });
          }
        }
      } catch {}
    }

    // B. "Trending Series"
    try {
      const trendingRes = await getTrending("tv", "week");
      const trendingItems = deduplicateAndAdd(
        trendingRes.results.map((i) => normalizeTmdbToRecItem(i, "tv", 85, ["Trending TV Series"])),
        limit
      );
      if (trendingItems.length > 0) {
        sections.push({
          id: "trending-tv",
          title: "Trending TV Series",
          subtitle: "Top binge-worthy series this week",
          items: trendingItems,
          layout: "poster",
          seeAllHref: "/series",
        });
      }
    } catch {}

    // C. "Airing Today & New Episodes"
    try {
      const airingRes = await getAiringTodayTV(1);
      const airingItems = deduplicateAndAdd(
        airingRes.results.map((i) => normalizeTmdbToRecItem(i, "tv", 70, ["New episode airing today"])),
        limit
      );
      if (airingItems.length > 0) {
        sections.push({
          id: "airing-today",
          title: "New Episodes Airing Now",
          subtitle: "Fresh weekly releases and season premieres",
          items: airingItems,
          layout: "poster",
          seeAllHref: "/series",
        });
      }
    } catch {}

    // D. "Popular TV Series"
    try {
      const popRes = await getPopularTV(1);
      const popItems = deduplicateAndAdd(
        popRes.results.map((i) => normalizeTmdbToRecItem(i, "tv", 80, ["Popular Worldwide"])),
        limit
      );
      if (popItems.length > 0) {
        sections.push({
          id: "popular-tv",
          title: "Popular Series",
          subtitle: "Must-watch shows across all genres",
          items: popItems,
          layout: "poster",
          seeAllHref: "/series",
        });
      }
    } catch {}
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. PERSONALIZED RECOMMENDATIONS (Logged-In or Guest Session History)
  // ──────────────────────────────────────────────────────────────────
  let personalizationApplied = false;
  if (userHistory && userHistory.length > 0) {
    const lastWatched = userHistory[0];
    if (lastWatched && lastWatched.title && (!title || lastWatched.title !== title)) {
      personalizationApplied = true;
      // If user has a recent different title in history, prepend a tailored rail
      try {
        if (lastWatched.mediaType === "anime") {
          const anilist = contentRegistry.getProvider("anilist") as AniListContentProvider | undefined;
          if (anilist?.enabled && lastWatched.genres && lastWatched.genres.length > 0) {
            const historyRec = await anilist.getByGenre(lastWatched.genres[0], 1, 16);
            const historyItems = deduplicateAndAdd(
              historyRec.items.map((i) =>
                normalizeAniListToRecItem(i, 88, [`Because you recently watched ${lastWatched.title}`])
              ),
              limit
            );
            if (historyItems.length > 0) {
              sections.unshift({
                id: "personalized-history-rec",
                title: `More Like ${lastWatched.title}`,
                subtitle: `Jump back into worlds like ${lastWatched.title}`,
                items: historyItems,
                layout: "poster",
              });
            }
          }
        }
      } catch {}
    }
  }

  const result: RecommendationResult = {
    sections,
    primaryMedia: {
      id: mediaId || tmdbId || anilistId || "home",
      title: title || "CHILLER Stream",
      mediaType,
      genres,
    },
    totalCount: sections.reduce((sum, s) => sum + s.items.length, 0),
    dedupedCount,
    cached: false,
    generatedAt: new Date().toISOString(),
    diagnostics: debug
      ? {
          candidateCount: totalCandidates,
          crossProviderDeduplications: dedupedCount,
          rankingWeights: { genreOverlap: 0.35, rating: 0.25, popularity: 0.25, recency: 0.15 },
          sources: Array.from(sourcesUsed),
          personalizationApplied,
        }
      : undefined,
  };

  // Cache results (30 mins TTL)
  const ttlMs = personalizationApplied ? 5 * 60 * 1000 : 30 * 60 * 1000;
  recCache.set(cacheKey, { data: result, expiresAt: Date.now() + ttlMs });

  return result;
}
