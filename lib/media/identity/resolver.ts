/**
 * lib/media/identity/resolver.ts
 *
 * CHILLER CANONICAL MEDIA IDENTITY RESOLVER
 *
 * Unifies all incoming media requests into a single CanonicalMediaIdentity.
 * STRICTLY PREVENTS ANI/TMDB ID POLLUTION.
 */

import { CanonicalMediaIdentity, ExternalIds, TitleSet } from "./types";
import { buildChillerId, registerCrosswalk, lookupCrosswalk } from "./id-mapper";
import { classifyMedia } from "@/lib/playback/media-classifier";
import { normalizeTitle } from "./title-matcher";

export interface ResolveIdentityInput {
  mediaType?: "movie" | "tv" | "anime" | "video";
  anilistId?: number | string;
  tmdbId?: number | string;
  malId?: number | string;
  kitsuId?: string;
  imdbId?: string;
  title?: string;
  englishTitle?: string;
  romajiTitle?: string;
  nativeTitle?: string;
  synonyms?: string[];
  format?: string;
  year?: number;
  seasonYear?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  totalEpisodes?: number;
  genres?: string[];
  studios?: string[];
  country?: string;
  provenanceSource?: "anilist" | "tmdb" | "mal" | "kitsu" | "simkl" | "internal";
}

/**
 * Resolves or constructs a canonical media identity.
 */
export function resolveCanonicalIdentity(input: ResolveIdentityInput): CanonicalMediaIdentity {
  const anilistNum = input.anilistId ? Number(input.anilistId) : undefined;
  const tmdbNum = input.tmdbId ? Number(input.tmdbId) : undefined;
  const malNum = input.malId ? Number(input.malId) : undefined;

  // 1. Check known crosswalk mappings
  const known =
    (anilistNum ? lookupCrosswalk("anilist", anilistNum) : null) ||
    (tmdbNum ? lookupCrosswalk("tmdb", tmdbNum) : null) ||
    (malNum ? lookupCrosswalk("mal", malNum) : null);

  const ids: ExternalIds = {
    anilistId: anilistNum || known?.anilistId,
    tmdbId: tmdbNum || known?.tmdbId,
    malId: malNum || known?.malId,
    imdbId: input.imdbId || known?.imdbId,
    kitsuId: input.kitsuId || known?.kitsuId,
    simklId: known?.simklId,
    tvdbId: known?.tvdbId,
  };

  // Register discovered crosswalk
  registerCrosswalk(ids);

  // 2. Classify media
  const classification = classifyMedia({
    mediaType: input.mediaType,
    anilistId: ids.anilistId,
    tmdbId: ids.tmdbId,
    malId: ids.malId,
    format: input.format,
    genres: input.genres,
    country: input.country,
    title: input.title || input.englishTitle || input.romajiTitle,
  });

  // 3. Construct TitleSet
  const canonicalTitle =
    input.englishTitle?.trim() ||
    input.title?.trim() ||
    input.romajiTitle?.trim() ||
    input.nativeTitle?.trim() ||
    "Untitled Content";

  const titles: TitleSet = {
    canonicalTitle,
    englishTitle: input.englishTitle?.trim(),
    romajiTitle: input.romajiTitle?.trim(),
    nativeTitle: input.nativeTitle?.trim(),
    synonyms: input.synonyms || [],
  };

  // 4. Calculate identity confidence
  let confidence = 0.5;
  if (ids.anilistId && classification.targetPool === "ANIME") confidence = 0.99;
  else if (ids.tmdbId && classification.targetPool === "GENERAL") confidence = 0.99;
  else if (ids.malId) confidence = 0.95;
  else if (input.title) confidence = 0.85;

  const effectiveType = classification.targetPool === "ANIME" ? "anime" : (input.mediaType || "movie");
  const chillerId = buildChillerId({
    mediaType: effectiveType,
    anilistId: ids.anilistId,
    tmdbId: ids.tmdbId,
    malId: ids.malId,
  });

  return {
    chillerId,
    mediaClass: classification.mediaClass,
    targetPool: classification.targetPool,
    titles,
    ids,
    format: (input.format?.toUpperCase() as any) || (classification.mediaClass === "MOVIE" ? "MOVIE" : "TV"),
    year: input.year || input.seasonYear,
    seasonYear: input.seasonYear,
    totalEpisodes: input.totalEpisodes,
    seasonNumber: input.seasonNumber,
    episodeNumber: input.episodeNumber,
    genres: input.genres || [],
    studios: input.studios || [],
    country: input.country,
    confidence,
    provenance: {
      primarySource: input.provenanceSource || (classification.targetPool === "ANIME" ? "anilist" : "tmdb"),
      verifiedAt: new Date().toISOString(),
      sourcesMatched: [input.provenanceSource || "unknown"],
    },
  };
}

/**
 * Merges two identities, giving priority to verified fields from primary while enriching with secondary.
 */
export function mergeIdentities(
  primary: CanonicalMediaIdentity,
  secondary: Partial<CanonicalMediaIdentity>
): CanonicalMediaIdentity {
  const mergedIds: ExternalIds = {
    ...secondary.ids,
    ...primary.ids,
  };

  const synonyms = Array.from(
    new Set([...primary.titles.synonyms, ...(secondary.titles?.synonyms || [])])
  );

  return {
    ...primary,
    ids: mergedIds,
    titles: {
      ...primary.titles,
      englishTitle: primary.titles.englishTitle || secondary.titles?.englishTitle,
      romajiTitle: primary.titles.romajiTitle || secondary.titles?.romajiTitle,
      nativeTitle: primary.titles.nativeTitle || secondary.titles?.nativeTitle,
      synonyms,
    },
    totalEpisodes: primary.totalEpisodes || secondary.totalEpisodes,
    genres: Array.from(new Set([...primary.genres, ...(secondary.genres || [])])),
    studios: Array.from(new Set([...primary.studios, ...(secondary.studios || [])])),
    provenance: {
      ...primary.provenance,
      sourcesMatched: Array.from(
        new Set([
          ...primary.provenance.sourcesMatched,
          ...(secondary.provenance?.sourcesMatched || []),
        ])
      ),
    },
  };
}
