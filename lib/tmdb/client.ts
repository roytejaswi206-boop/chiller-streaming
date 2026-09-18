import https from "node:https";
import dns from "node:dns";
import { getTmdbApiKey } from "@/lib/settings";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

// Fallback DNS resolver for environments (e.g. Jio/Indian ISPs) where api.themoviedb.org is blackholed/poisoned
const fallbackResolver = new dns.promises.Resolver();
fallbackResolver.setServers(["8.8.8.8", "1.1.1.1"]);

function customDnsLookup(hostname: string, options: any, callback: (err: any, address?: any, family?: number) => void) {
  let cb = callback;
  let opts = options;
  if (typeof options === "function") {
    cb = options;
    opts = {};
  }

  if (hostname === "api.themoviedb.org") {
    fallbackResolver
      .resolve4(hostname)
      .then((addresses) => {
        if (opts && opts.all) {
          cb(
            null,
            addresses.map((a) => ({ address: a, family: 4 }))
          );
        } else {
          cb(null, addresses[0], 4);
        }
      })
      .catch(() => {
        dns.lookup(hostname, opts, cb);
      });
  } else {
    dns.lookup(hostname, opts, cb);
  }
}

interface NetworkResponse {
  status: number;
  statusText: string;
  data: any;
  text: string;
}

function requestTmdb(urlStr: string, headers: Record<string, string> = {}): Promise<NetworkResponse> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const req = https.request(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Chiller/1.0",
            ...headers,
          },
          lookup: customDnsLookup,
          timeout: 15000,
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            let data: any = null;
            try {
              data = JSON.parse(body);
            } catch {
              data = null;
            }
            resolve({
              status: res.statusCode || 200,
              statusText: res.statusMessage || "",
              data,
              text: body,
            });
          });
        }
      );

      req.on("timeout", () => {
        req.destroy(new Error("TMDB_REQUEST_TIMEOUT"));
      });
      req.on("error", (err) => reject(err));
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Simple in-memory cache with TTL to protect TMDB rate limits
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

export interface TmdbMediaItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type?: "movie" | "tv" | "person";
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult?: boolean;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: TmdbSeasonBrief[];
  credits?: {
    cast: TmdbCastMember[];
    crew: TmdbCrewMember[];
  };
  recommendations?: {
    results: TmdbMediaItem[];
  };
  similar?: {
    results: TmdbMediaItem[];
  };
}

export interface TmdbSeasonBrief {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  episode_count: number;
  air_date?: string;
}

export interface TmdbEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string;
  still_path: string | null;
  vote_average: number;
  runtime?: number;
}

export interface TmdbSeasonDetail {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episodes: TmdbEpisode[];
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface TmdbPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/**
 * Format image URL with sensible size defaults
 */
export function getTmdbImageUrl(
  path: string | null | undefined,
  size: "w300" | "w500" | "w780" | "w1280" | "original" = "original"
): string {
  if (!path) return "/placeholder-poster.png";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Helper to execute cached, deduplicated TMDB requests
 */
async function tmdbFetch<T>(endpoint: string, params: Record<string, string | number> = {}, ttlSeconds = 600): Promise<T> {
  const apiKey = await getTmdbApiKey();
  if (!apiKey) {
    throw new Error("TMDB_NOT_CONFIGURED");
  }

  // Build query URL
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, val]) => {
    url.searchParams.set(key, String(val));
  });

  const isBearer = apiKey.startsWith("ey") || apiKey.length > 50;
  if (!isBearer) {
    url.searchParams.set("api_key", apiKey);
  }

  const cacheKey = url.toString();
  const now = Date.now();

  // 1. Check cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // 2. In-flight request deduplication
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (isBearer) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const res = await requestTmdb(url.toString(), headers);

      if (res.status !== 200) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("TMDB_AUTH_ERROR");
        }
        if (res.status === 404) {
          throw new Error("TMDB_NOT_FOUND");
        }
        throw new Error(`TMDB_API_ERROR_${res.status}`);
      }

      const data = res.data as T;
      cache.set(cacheKey, { data, expiresAt: now + ttlSeconds * 1000 });
      return data;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Test TMDB API connection with the specified or saved key
 */
export async function testTmdbConnection(customKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const key = customKey || (await getTmdbApiKey());
    if (!key) {
      return { success: false, message: "TMDB API key or access token is not configured." };
    }

    const isBearer = key.startsWith("ey") || key.length > 50;
    const url = new URL(`${TMDB_BASE_URL}/configuration`);
    const headers: Record<string, string> = { Accept: "application/json" };

    if (isBearer) {
      headers["Authorization"] = `Bearer ${key}`;
    } else {
      url.searchParams.set("api_key", key);
    }

    const res = await requestTmdb(url.toString(), headers);
    if (res.status === 200) {
      return { success: true, message: "Connected successfully to TMDB." };
    }
    return { success: false, message: `TMDB returned status ${res.status}: ${res.text || res.statusText}` };
  } catch (err: any) {
    return { success: false, message: `Connection failed: ${err.message}` };
  }
}

/**
 * Trending titles (All, Movies, TV)
 */
export async function getTrending(
  mediaType: "all" | "movie" | "tv" = "all",
  timeWindow: "day" | "week" = "week"
): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>(`/trending/${mediaType}/${timeWindow}`);
}

/**
 * Popular movies
 */
export async function getPopularMovies(page = 1): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/movie/popular", { page });
}

/**
 * Top rated movies
 */
export async function getTopRatedMovies(page = 1): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/movie/top_rated", { page });
}

/**
 * Now playing in theaters
 */
export async function getNowPlayingMovies(page = 1): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/movie/now_playing", { page });
}

/**
 * Popular TV Series
 */
export async function getPopularTV(page = 1): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/tv/popular", { page });
}

/**
 * Top rated TV Series
 */
export async function getTopRatedTV(page = 1): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/tv/top_rated", { page });
}

/**
 * Anime discovery: animation genre (16) + Japanese origin language (ja)
 */
export async function getPopularAnime(page = 1): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/discover/tv", {
    with_genres: 16,
    with_original_language: "ja",
    sort_by: "popularity.desc",
    page,
  });
}

/**
 * Top rated Anime series
 */
export async function getTopRatedAnime(page = 1): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/discover/tv", {
    with_genres: 16,
    with_original_language: "ja",
    "vote_count.gte": 100,
    sort_by: "vote_average.desc",
    page,
  });
}

/**
 * Anime movies
 */
export async function getAnimeMovies(page = 1): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/discover/movie", {
    with_genres: 16,
    with_original_language: "ja",
    sort_by: "popularity.desc",
    page,
  });
}

/**
 * Detailed movie metadata with cast and recommendations
 */
export async function getMovieDetails(id: number | string): Promise<TmdbMediaItem> {
  return tmdbFetch<TmdbMediaItem>(`/movie/${id}`, {
    append_to_response: "credits,recommendations,similar,videos",
  });
}

/**
 * Detailed TV metadata with seasons, cast, and recommendations
 */
export async function getTVDetails(id: number | string): Promise<TmdbMediaItem> {
  return tmdbFetch<TmdbMediaItem>(`/tv/${id}`, {
    append_to_response: "credits,recommendations,similar,videos",
  });
}

/**
 * Detailed Season metadata with episodes
 */
export async function getSeasonDetails(tvId: number | string, seasonNumber: number): Promise<TmdbSeasonDetail> {
  return tmdbFetch<TmdbSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
}

/**
 * Multi-search (movies, tv shows, anime)
 */
export async function searchMulti(query: string, page = 1): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/search/multi", {
    query,
    page,
    include_adult: "false",
  });
}

/**
 * Discover movies with custom filters (e.g. by genre)
 */
export async function discoverMovies(params: Record<string, string | number> = {}): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/discover/movie", params);
}

/**
 * Discover TV with custom filters (e.g. by genre)
 */
export async function discoverTV(params: Record<string, string | number> = {}): Promise<TmdbPaginatedResponse<TmdbMediaItem>> {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMediaItem>>("/discover/tv", params);
}
