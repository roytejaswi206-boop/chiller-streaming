import {
  getMovieDetails,
  getPopularMovies,
  getPopularTV,
  getSeasonDetails,
  getTopRatedMovies,
  getTopRatedTV,
  getTrending,
  getTVDetails,
  searchMulti,
  testTmdbConnection,
} from "@/lib/tmdb/client";
import { normalizeTmdbItem } from "../normalizer";
import { ChillerContent, ChillerSeason, ContentProvider, ContentProviderStatus, ContentType } from "../types";

export class TmdbContentProvider implements ContentProvider {
  id = "tmdb";
  name = "TMDB (The Movie Database)";
  category = "general" as const;
  enabled = true;
  requiresApiKey = true;
  priority = 1;

  async search(query: string, type?: ContentType): Promise<ChillerContent[]> {
    if (!query.trim()) return [];
    try {
      const res = await searchMulti(query, 1);
      return res.results
        .filter((item) => {
          if (type === "movie") return item.media_type === "movie";
          if (type === "tv" || type === "anime") return item.media_type === "tv";
          return item.media_type === "movie" || item.media_type === "tv";
        })
        .map((item) => normalizeTmdbItem(item, type));
    } catch {
      return [];
    }
  }

  async getMovie(id: number | string): Promise<ChillerContent | null> {
    const tmdbId = Number(id);
    if (isNaN(tmdbId)) return null;

    try {
      const details = await getMovieDetails(tmdbId);
      return normalizeTmdbItem(details, "movie");
    } catch {
      return null;
    }
  }

  async getTV(id: number | string): Promise<ChillerContent | null> {
    const tmdbId = Number(id);
    if (isNaN(tmdbId)) return null;

    try {
      const details = await getTVDetails(tmdbId);
      return normalizeTmdbItem(details, "tv");
    } catch {
      return null;
    }
  }

  async getSeason(id: number | string, seasonNumber: number): Promise<ChillerSeason | null> {
    const tmdbId = Number(id);
    if (isNaN(tmdbId)) return null;

    try {
      const detail = await getSeasonDetails(tmdbId, seasonNumber);
      return {
        seasonNumber: detail.season_number,
        name: detail.name,
        overview: detail.overview,
        posterUrl: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : undefined,
        episodeCount: detail.episodes?.length || 0,
        airDate: detail.air_date,
        episodes: detail.episodes?.map((ep) => ({
          id: ep.id,
          episodeNumber: ep.episode_number,
          seasonNumber: ep.season_number,
          title: ep.name,
          overview: ep.overview,
          airDate: ep.air_date,
          thumbnailUrl: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : undefined,
          rating: ep.vote_average,
          runtime: ep.runtime,
        })),
      };
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<{
    status: ContentProviderStatus;
    latencyMs?: number;
    message?: string;
  }> {
    const start = Date.now();
    try {
      const res = await testTmdbConnection();
      const latencyMs = Date.now() - start;
      return {
        status: res.success ? "ACTIVE" : "FAILED",
        latencyMs,
        message: res.message,
      };
    } catch (err: any) {
      return {
        status: "FAILED",
        latencyMs: Date.now() - start,
        message: err.message,
      };
    }
  }
}
