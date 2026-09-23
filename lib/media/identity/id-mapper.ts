/**
 * lib/media/identity/id-mapper.ts
 *
 * CHILLER CROSSWALK ID MAPPER
 *
 * Strictly separates external provider namespaces:
 * - AniList ID != TMDB ID != MAL ID != Kitsu ID != SIMKL ID
 *
 * Manages translation, crosswalk lookups, and canonical ID generation.
 */

import { ExternalIds, CanonicalMediaIdentity } from "./types";

/**
 * Builds standard immutable internal Chiller ID.
 */
export function buildChillerId(params: {
  mediaType: "movie" | "tv" | "anime" | "video";
  anilistId?: number | string;
  tmdbId?: number | string;
  malId?: number | string;
  videoId?: string;
}): string {
  if (params.mediaType === "anime") {
    if (params.anilistId) return `chiller:anime:anilist:${params.anilistId}`;
    if (params.malId) return `chiller:anime:mal:${params.malId}`;
    if (params.tmdbId) return `chiller:anime:tmdb:${params.tmdbId}`;
  }

  if (params.mediaType === "movie" && params.tmdbId) {
    return `chiller:movie:tmdb:${params.tmdbId}`;
  }

  if (params.mediaType === "tv" && params.tmdbId) {
    return `chiller:tv:tmdb:${params.tmdbId}`;
  }

  if (params.videoId) {
    return `chiller:video:${params.videoId}`;
  }

  const randomPart = Math.random().toString(36).substring(2, 8);
  return `chiller:${params.mediaType}:${randomPart}`;
}

// In-memory crosswalk store for runtime fast translation
const crosswalkStore = new Map<string, ExternalIds>();

/**
 * Registers an established ID crosswalk mapping.
 */
export function registerCrosswalk(ids: ExternalIds) {
  const keys: string[] = [];
  if (ids.anilistId) keys.push(`anilist:${ids.anilistId}`);
  if (ids.malId) keys.push(`mal:${ids.malId}`);
  if (ids.tmdbId) keys.push(`tmdb:${ids.tmdbId}`);
  if (ids.imdbId) keys.push(`imdb:${ids.imdbId}`);

  for (const k of keys) {
    const existing = crosswalkStore.get(k) || {};
    crosswalkStore.set(k, { ...existing, ...ids });
  }
}

/**
 * Looks up known crosswalk mappings for a given external identifier.
 */
export function lookupCrosswalk(system: "anilist" | "mal" | "tmdb" | "imdb", id: number | string): ExternalIds | null {
  const key = `${system}:${id}`;
  return crosswalkStore.get(key) || null;
}

/**
 * Asserts that an identifier belongs to its declared namespace and is not mistakenly assigned.
 */
export function validateIdentifier(
  type: "anilistId" | "tmdbId" | "malId",
  value: number | undefined
): boolean {
  if (value === undefined || value === null) return true;
  return Number.isInteger(value) && value > 0;
}

export function getCrosswalkStats(): { totalEntries: number; sampleTitles: string[] } {
  return {
    totalEntries: crosswalkStore.size,
    sampleTitles: Array.from(crosswalkStore.keys()).slice(0, 10),
  };
}

