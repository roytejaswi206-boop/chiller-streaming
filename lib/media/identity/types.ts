/**
 * lib/media/identity/types.ts
 *
 * CHILLER CANONICAL MEDIA IDENTITY ARCHITECTURE
 *
 * Defines strictly isolated and cross-referenced identifiers for all media types.
 * PREVENTS ACCIDENTAL ID CONFUSION (e.g. AniList ID vs TMDB ID).
 */

import { MediaClass } from "@/lib/playback/media-classifier";

export type MediaFormat =
  | "MOVIE"
  | "TV"
  | "TV_SHORT"
  | "OVA"
  | "ONA"
  | "SPECIAL"
  | "MUSIC"
  | "DOCUMENTARY"
  | "OTHER";

export interface ExternalIds {
  tmdbId?: number;
  anilistId?: number;
  malId?: number;
  kitsuId?: string;
  simklId?: number;
  imdbId?: string;
  tvdbId?: number;
}

export interface TitleSet {
  canonicalTitle: string;
  englishTitle?: string;
  romajiTitle?: string;
  nativeTitle?: string;
  synonyms: string[];
  abbreviations?: string[];
}

export interface CanonicalMediaIdentity {
  chillerId: string; // e.g. "chiller:anime:anilist:154587" or "chiller:movie:tmdb:550"
  mediaClass: MediaClass;
  targetPool: "GENERAL" | "ANIME";
  titles: TitleSet;
  ids: ExternalIds;
  format?: MediaFormat;
  year?: number;
  seasonYear?: number;
  seasonName?: "WINTER" | "SPRING" | "SUMMER" | "FALL";
  totalEpisodes?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  country?: string;
  genres: string[];
  studios: string[];
  confidence: number; // 0 to 1
  provenance: {
    primarySource: "anilist" | "tmdb" | "mal" | "kitsu" | "simkl" | "internal";
    verifiedAt: string;
    sourcesMatched: string[];
  };
}

export interface IdentityMatchCandidate {
  identity: CanonicalMediaIdentity;
  score: number; // 0 to 1
  matchedField: "exact_id" | "external_id_mapping" | "exact_title" | "alias" | "fuzzy";
  reason: string;
}
