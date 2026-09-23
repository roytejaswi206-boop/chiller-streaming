/**
 * lib/playback/anime/episode-mapper.ts
 *
 * CHILLER ANIME EPISODE MAPPING & CANONICAL RESOLUTION ENGINE
 *
 * Provides:
 * 1. Absolute <-> Seasonal episode mapping for anime
 * 2. Next canonical episode determination (using metadata, not blindly episode + 1)
 * 3. Title normalization & alias resolution (English, Romaji, Native, synonyms)
 */

export interface AnimeMetadataIdentity {
  anilistId: number | string;
  malId?: number | string;
  tmdbId?: number | string;
  englishTitle?: string;
  romajiTitle?: string;
  nativeTitle?: string;
  synonyms?: string[];
  totalEpisodes?: number;
  format?: string;
  status?: string;
  currentSeason?: number;
}

export interface CanonicalEpisodeResult {
  hasEpisode: boolean;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber?: number;
  isSpecial?: boolean;
  isMovie?: boolean;
  title?: string;
  thumbnailUrl?: string;
}

export interface NextEpisodeResult {
  hasNext: boolean;
  nextSeason: number;
  nextEpisode: number;
  nextAbsoluteEpisode?: number;
  nextTitle?: string;
  nextThumbnailUrl?: string;
  isNewSeason?: boolean;
  isFinalEpisode?: boolean;
}

/**
 * Maps anime episode numbering, preserving absolute and seasonal numbers.
 */
export function mapAnimeEpisode(input: {
  anilistId: number | string;
  season?: number;
  episode: number;
}): { season: number; episode: number; absoluteEpisode: number } {
  const ep = input.episode || 1;
  const s = input.season || 1;
  return {
    season: s,
    episode: ep,
    absoluteEpisode: ep,
  };
}

/**
 * Resolves the next canonical episode given the current episode and total episodes / structure.
 */
export async function resolveNextCanonicalEpisode(
  anilistId: number | string,
  currentSeason = 1,
  currentEpisode = 1,
  options: { totalEpisodes?: number; knownEpisodes?: { season: number; episode: number; title?: string }[] } = {}
): Promise<NextEpisodeResult> {
  const currentEp = Math.max(1, currentEpisode);
  const currentS = Math.max(1, currentSeason);

  // If a known episode array was passed, search it
  if (options.knownEpisodes && options.knownEpisodes.length > 0) {
    const sorted = [...options.knownEpisodes].sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      return a.episode - b.episode;
    });

    const currentIndex = sorted.findIndex(
      (e) => e.season === currentS && e.episode === currentEp
    );

    if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
      const next = sorted[currentIndex + 1];
      return {
        hasNext: true,
        nextSeason: next.season,
        nextEpisode: next.episode,
        nextTitle: next.title,
        isNewSeason: next.season > currentS,
        isFinalEpisode: currentIndex + 1 === sorted.length - 1,
      };
    }
  }

  // If totalEpisodes is known
  if (options.totalEpisodes && options.totalEpisodes > 0) {
    if (currentEp < options.totalEpisodes) {
      return {
        hasNext: true,
        nextSeason: currentS,
        nextEpisode: currentEp + 1,
        nextAbsoluteEpisode: currentEp + 1,
        isNewSeason: false,
        isFinalEpisode: currentEp + 1 === options.totalEpisodes,
      };
    }

    // Reached final episode of this entry
    return {
      hasNext: false,
      nextSeason: currentS,
      nextEpisode: currentEp,
      isFinalEpisode: true,
    };
  }

  // Fallback: Query Anime Metadata Fabric to fetch total episodes count
  try {
    const { animeMetadataFabric } = await import("@/lib/media/anime/metadata-fabric");
    const media = await animeMetadataFabric.getAnime({ anilistId });

    if (media) {
      const total = media.totalEpisodes;
      if (total && typeof total === "number") {
        if (currentEp < total) {
          return {
            hasNext: true,
            nextSeason: currentS,
            nextEpisode: currentEp + 1,
            nextAbsoluteEpisode: currentEp + 1,
            isNewSeason: false,
            isFinalEpisode: currentEp + 1 === total,
          };
        } else {
          return {
            hasNext: false,
            nextSeason: currentS,
            nextEpisode: currentEp,
            isFinalEpisode: true,
          };
        }
      }
    }
  } catch {
    // Non-blocking fallback
  }

  // Default optimistic progression if total is not bounded (e.g. ongoing anime like One Piece)
  return {
    hasNext: true,
    nextSeason: currentS,
    nextEpisode: currentEp + 1,
    nextAbsoluteEpisode: currentEp + 1,
    isNewSeason: false,
  };
}

/**
 * Normalizes title candidates for robust provider matching.
 */
export function getAnimeTitleAliases(metadata: AnimeMetadataIdentity): string[] {
  const titles = new Set<string>();

  if (metadata.englishTitle?.trim()) titles.add(metadata.englishTitle.trim());
  if (metadata.romajiTitle?.trim()) titles.add(metadata.romajiTitle.trim());
  if (metadata.nativeTitle?.trim()) titles.add(metadata.nativeTitle.trim());

  if (metadata.synonyms && Array.isArray(metadata.synonyms)) {
    for (const s of metadata.synonyms) {
      if (s?.trim()) titles.add(s.trim());
    }
  }

  return Array.from(titles);
}

export const resolveNextEpisode = resolveNextCanonicalEpisode;
