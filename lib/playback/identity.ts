import { lookupCrosswalk } from "@/lib/media/identity/id-mapper";

export interface MediaIdentity {
  tmdbId?: number;
  anilistId?: number;
  malId?: number;
  imdbId?: string;
  mediaType: "movie" | "tv" | "anime";
  title?: string;
  originalTitle?: string;
  releaseYear?: string;
  slug?: string;
  season?: number;
  episode?: number;
}

/**
 * Normalizes input slugs or params into a structured MediaIdentity.
 * Handles formats like:
 * - "movie/550"
 * - "tv/1399/2/3"
 * - "anime/16498/5"
 * - "inception-27205"
 * - "the-last-of-us-100088"
 * - "movie-550"
 * - "tv-1399-2-3"
 * - "550"
 */
export function parseMediaSlug(slug: string | string[]): MediaIdentity | null {
  const normalized = Array.isArray(slug) ? slug.join("/") : slug;
  if (!normalized) return null;

  // Pattern: /watch/movie/550 or /watch/tv/1399/1/2 or /watch/anime/16498/3
  const pathParts = normalized.split("/").filter(Boolean);
  if (pathParts.length >= 2) {
    const type = pathParts[0].toLowerCase();
    const idPart = pathParts[1];
    
    // Check if idPart is pure number or slug with ID at end (e.g. dune-part-two-693134)
    let parsedId = parseInt(idPart, 10);
    if (isNaN(parsedId) && idPart.includes("-")) {
      const parts = idPart.split("-");
      const last = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(last) && last > 0) parsedId = last;
    }

    const season = pathParts.length >= 3 ? parseInt(pathParts[2], 10) : undefined;
    const episode = pathParts.length >= 4 ? parseInt(pathParts[3], 10) : undefined;

    if (!isNaN(parsedId) && parsedId > 0) {
      if (type === "movie" || type === "movies") return { mediaType: "movie", tmdbId: parsedId };
      if (type === "tv" || type === "series") return { mediaType: "tv", tmdbId: parsedId, season, episode };
      if (type === "anime") {
        const cw = lookupCrosswalk("tmdb", parsedId);
        const anilistId = cw?.anilistId ? Number(cw.anilistId) : parsedId;
        const tmdbId = cw?.tmdbId ? Number(cw.tmdbId) : (anilistId !== parsedId ? parsedId : undefined);
        return { mediaType: "anime", anilistId, tmdbId, season: 1, episode: season || episode || 1 };
      }
    }
  }

  // Pattern: anime-16498 or anime-16498-1-1
  if (normalized.startsWith("anime-")) {
    const parts = normalized.replace("anime-", "").split("-");
    const id = parseInt(parts[0], 10);
    const episode = parts.length >= 2 ? parseInt(parts[1], 10) : undefined;
    if (isNaN(id)) return null;
    const cw = lookupCrosswalk("tmdb", id);
    const anilistId = cw?.anilistId ? Number(cw.anilistId) : id;
    const tmdbId = cw?.tmdbId ? Number(cw.tmdbId) : undefined;
    return { mediaType: "anime", anilistId, tmdbId, episode: episode || 1 };
  }

  // Pattern: movie-550
  if (normalized.startsWith("movie-")) {
    const parts = normalized.replace("movie-", "").split("-");
    const id = parseInt(parts[parts.length - 1], 10);
    return isNaN(id) ? null : { mediaType: "movie", tmdbId: id };
  }

  // Pattern: tv-1399 or tv-1399-1-1
  if (normalized.startsWith("tv-") || normalized.startsWith("series-")) {
    const clean = normalized.replace(/^(tv|series)-/, "");
    const parts = clean.split("-");
    const id = parseInt(parts[0], 10);
    const season = parts.length >= 2 ? parseInt(parts[1], 10) : undefined;
    const episode = parts.length >= 3 ? parseInt(parts[2], 10) : undefined;
    return isNaN(id) ? null : { mediaType: "tv", tmdbId: id, season, episode };
  }

  // Pattern: human-friendly slug with trailing ID e.g. "inception-27205"
  if (normalized.includes("-")) {
    const parts = normalized.split("-");
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last) && last > 0) {
      return { mediaType: "movie", tmdbId: last };
    }
  }

  // Pure numeric ID defaults to movie
  if (/^\d+$/.test(normalized)) {
    const id = parseInt(normalized, 10);
    return { mediaType: "movie", tmdbId: id };
  }

  return null;
}

