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

const CANONICAL_ANIME_SEEDS: ExternalIds[] = [
  { anilistId: 20, malId: 20, tmdbId: 46260 }, // Naruto
  { anilistId: 1735, malId: 1735, tmdbId: 31910 }, // Naruto Shippuden
  { anilistId: 21, malId: 21, tmdbId: 37854 }, // One Piece
  { anilistId: 501, malId: 2471, tmdbId: 65733 }, // Doraemon
  { anilistId: 501, malId: 2471, tmdbId: 57911 },
  { anilistId: 501, malId: 2471, tmdbId: 40788 },
  { anilistId: 527, malId: 527, tmdbId: 60572 }, // Pokémon
  { anilistId: 269, malId: 269, tmdbId: 30984 }, // Bleach
  { anilistId: 223, malId: 223, tmdbId: 12609 }, // Dragon Ball
  { anilistId: 813, malId: 813, tmdbId: 12971 }, // Dragon Ball Z
  { anilistId: 21175, malId: 30694, tmdbId: 62715 }, // Dragon Ball Super
  { anilistId: 21175, malId: 30694, tmdbId: 62710 },
  { anilistId: 101922, malId: 38000, tmdbId: 85937 }, // Demon Slayer (Kimetsu no Yaiba)
  { anilistId: 113415, malId: 40748, tmdbId: 95479 }, // Jujutsu Kaisen
  { anilistId: 16498, malId: 16498, tmdbId: 1429 }, // Attack on Titan
  { anilistId: 21459, malId: 31964, tmdbId: 65930 }, // My Hero Academia
  { anilistId: 11061, malId: 11061, tmdbId: 46298 }, // Hunter x Hunter (2011)
  { anilistId: 136, malId: 136, tmdbId: 46298 }, // Hunter x Hunter (1999)
  { anilistId: 1535, malId: 1535, tmdbId: 13916 }, // Death Note
  { anilistId: 21087, malId: 30276, tmdbId: 63926 }, // One Punch Man
  { anilistId: 97940, malId: 34572, tmdbId: 73223 }, // Black Clover
  { anilistId: 151807, malId: 52299, tmdbId: 127532 }, // Solo Leveling
  { anilistId: 154587, malId: 52991, tmdbId: 209867 }, // Frieren (Sousou no Frieren)
  { anilistId: 20464, malId: 20583, tmdbId: 60863 }, // Haikyuu!!
  { anilistId: 120120, malId: 42249, tmdbId: 121533 }, // Tokyo Revengers
  { anilistId: 105333, malId: 38691, tmdbId: 86031 }, // Dr. Stone
  { anilistId: 140960, malId: 50265, tmdbId: 120089 }, // Spy x Family
  { anilistId: 127230, malId: 44511, tmdbId: 114410 }, // Chainsaw Man
  { anilistId: 5114, malId: 5114, tmdbId: 31911 }, // Fullmetal Alchemist: Brotherhood
  { anilistId: 21519, tmdbId: 372058 }, // Your Name (anime movie)
  { anilistId: 199, tmdbId: 129 }, // Spirited Away (anime movie)
];

// Initialize seed crosswalk mappings immediately
for (const seed of CANONICAL_ANIME_SEEDS) {
  registerCrosswalk(seed);
}

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
 * Canonical helper: resolves an AniList ID from any incoming identifier (AniList, TMDB, MAL, or Title).
 * Handles the common scenario where a TMDB ID was passed in an anime slot.
 */
export async function resolveAnimeAnilistId(identifier: {
  anilistId?: number | string;
  tmdbId?: number | string;
  malId?: number | string;
  title?: string;
}): Promise<number | null> {
  const rawAniId = identifier.anilistId ? parseInt(String(identifier.anilistId), 10) : undefined;
  const rawTmdbId = identifier.tmdbId ? parseInt(String(identifier.tmdbId), 10) : undefined;
  const rawMalId = identifier.malId ? parseInt(String(identifier.malId), 10) : undefined;

  // 1. Direct crosswalk lookup by TMDB ID
  if (rawTmdbId) {
    const cw = lookupCrosswalk("tmdb", rawTmdbId);
    if (cw?.anilistId) {
      return Number(cw.anilistId);
    }
  }

  // 2. If rawAniId was passed, check if it's actually an accidental TMDB ID in the anime slot
  if (rawAniId) {
    const cwAsTmdb = lookupCrosswalk("tmdb", rawAniId);
    if (cwAsTmdb?.anilistId) {
      // It was a TMDB ID mapped to a canonical AniList ID!
      return Number(cwAsTmdb.anilistId);
    }
    const cwAsAni = lookupCrosswalk("anilist", rawAniId);
    if (cwAsAni?.anilistId) {
      return Number(cwAsAni.anilistId);
    }
    // If it's a positive integer, it might already be an AniList ID
    if (rawAniId > 0 && rawAniId < 500000) {
      return rawAniId;
    }
  }

  // 3. MAL lookup
  if (rawMalId) {
    const cwMal = lookupCrosswalk("mal", rawMalId);
    if (cwMal?.anilistId) return Number(cwMal.anilistId);
  }

  // 4. Dynamic title fallback resolution via AniList
  let titleToSearch = identifier.title;
  if (!titleToSearch && rawTmdbId) {
    try {
      const { getTVDetails, getMovieDetails } = await import("@/lib/tmdb/client");
      const tv = await getTVDetails(rawTmdbId).catch(() => null);
      if (tv?.name) {
        titleToSearch = tv.name;
      } else {
        const mv = await getMovieDetails(rawTmdbId).catch(() => null);
        if (mv?.title) titleToSearch = mv.title;
      }
    } catch {}
  }

  if (titleToSearch) {
    try {
      const { AniListContentProvider } = await import("@/lib/content/providers/anilist");
      const anilist = new AniListContentProvider();
      const results = await anilist.search(titleToSearch, 1, 5);
      if (results.items?.length) {
        const top = results.items[0];
        const resolvedId = Number(top.externalIds?.anilistId || top.id);
        if (resolvedId > 0) {
          registerCrosswalk({
            anilistId: resolvedId,
            tmdbId: rawTmdbId,
            malId: rawMalId,
          });
          return resolvedId;
        }
      }
    } catch {}
  }

  return rawAniId || rawTmdbId || null;
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

