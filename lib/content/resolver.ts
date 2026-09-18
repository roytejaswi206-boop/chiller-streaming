import { enrichWithAniList, enrichWithTvmaze, normalizeTmdbItem } from "./normalizer";
import { contentRegistry } from "./registry";
import { ChillerAvailability, ChillerContent, ContentType } from "./types";
import { getMovieDetails, getSeasonDetails, getTVDetails } from "@/lib/tmdb/client";

/**
 * Resolves unified movie metadata enriched with availability where configured
 */
export async function getUnifiedMovie(tmdbId: number): Promise<ChillerContent | null> {
  try {
    const tmdbData = await getMovieDetails(tmdbId);
    let content = normalizeTmdbItem(tmdbData, "movie");

    // Optional Watchmode availability enrichment
    const watchmode = contentRegistry.getProvider("watchmode");
    if (watchmode?.enabled && watchmode.getAvailability) {
      try {
        const avail = await watchmode.getAvailability(tmdbId, "movie");
        if (avail) {
          (content as any).availability = avail;
        }
      } catch {
        // Non-blocking
      }
    }

    return content;
  } catch {
    return null;
  }
}

/**
 * Resolves unified TV show metadata enriched with TVmaze & availability
 */
export async function getUnifiedTV(tmdbId: number): Promise<ChillerContent | null> {
  try {
    const tmdbData = await getTVDetails(tmdbId);
    let content = normalizeTmdbItem(tmdbData, "tv");

    // TVmaze enrichment (non-blocking)
    const tvmaze = contentRegistry.getProvider("tvmaze");
    if (tvmaze?.enabled) {
      try {
        const matches = await tvmaze.search(content.title);
        if (matches.length > 0) {
          content = enrichWithTvmaze(content, matches[0]);
        }
      } catch {
        // Non-blocking
      }
    }

    // Watchmode availability (non-blocking)
    const watchmode = contentRegistry.getProvider("watchmode");
    if (watchmode?.enabled && watchmode.getAvailability) {
      try {
        const avail = await watchmode.getAvailability(tmdbId, "tv");
        if (avail) {
          (content as any).availability = avail;
        }
      } catch {
        // Non-blocking
      }
    }

    return content;
  } catch {
    return null;
  }
}

/**
 * Resolves unified anime metadata enriched with AniList & Jikan
 */
export async function getUnifiedAnime(tmdbId: number): Promise<ChillerContent | null> {
  try {
    const tmdbData = await getTVDetails(tmdbId);
    let content = normalizeTmdbItem(tmdbData, "anime");

    // AniList enrichment (GraphQL)
    const anilist = contentRegistry.getProvider("anilist");
    if (anilist?.enabled) {
      try {
        const matches = await anilist.search(content.title);
        if (matches.length > 0) {
          content = enrichWithAniList(content, matches[0]);
        }
      } catch {
        // Non-blocking
      }
    }

    return content;
  } catch {
    return null;
  }
}

/**
 * Multi-source search across TMDB and specialized providers
 */
export async function searchUnified(query: string, type?: ContentType): Promise<ChillerContent[]> {
  const tmdb = contentRegistry.getProvider("tmdb");
  if (!tmdb) return [];

  const results = await tmdb.search(query, type);

  // If anime type requested, enrich top hits with AniList titles
  if (type === "anime") {
    const anilist = contentRegistry.getProvider("anilist");
    if (anilist?.enabled) {
      try {
        const aniMatches = await anilist.search(query);
        // Combine without duplicates
        const existingIds = new Set(results.map((r) => r.title.toLowerCase()));
        for (const a of aniMatches) {
          if (!existingIds.has(a.title.toLowerCase())) {
            results.push(a);
          }
        }
      } catch {
        // Non-blocking
      }
    }
  }

  return results;
}
