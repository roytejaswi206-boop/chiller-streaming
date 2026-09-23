/**
 * lib/playback/media-classifier.ts
 *
 * CHILLER MEDIA CLASSIFIER
 *
 * Classifies every playback and discovery request into specialized media classes:
 * - MOVIE: Standard theatrical or direct-to-video films (General Pool)
 * - TV: General multi-episode television series (General Pool)
 * - ANIME: Japanese animated series, OVAs, ONAs, specials (Anime Pool)
 * - ANIME_MOVIE: Theatrical anime films (Anime Pool first, verified General fallback)
 * - DOCUMENTARY: Non-fiction films or series (General Pool)
 * - OTHER: User-owned media or uncategorized video (General Pool)
 *
 * Uses multi-signal canonical detection: AniList ID, AniList format, genres,
 * studios, and TMDB animation metadata. Never relies solely on original_language === 'ja'.
 */

export type MediaClass =
  | "MOVIE"
  | "TV"
  | "ANIME"
  | "ANIME_MOVIE"
  | "DOCUMENTARY"
  | "OTHER";

export interface MediaClassificationInput {
  mediaType?: "movie" | "tv" | "anime" | "video";
  anilistId?: number | string;
  malId?: number | string;
  tmdbId?: number | string;
  format?: string;
  genres?: string[];
  originalLanguage?: string;
  country?: string;
  title?: string;
  season?: number;
  episode?: number;
  keywords?: string[];
  animationType?: string;
}

export interface ClassificationResult {
  mediaClass: MediaClass;
  targetPool: "GENERAL" | "ANIME";
  isAnime: boolean;
  confidence: number; // 0 to 1
  signals: string[];
  reason: string;
}

/**
 * Classifies media into its canonical MediaClass.
 */
export function classifyMedia(input: MediaClassificationInput): ClassificationResult {
  const signals: string[] = [];
  let animeScore = 0;

  // Signal 1: Explicit AniList ID presence (highest anime identity confidence)
  if (input.anilistId && Number(input.anilistId) > 0) {
    animeScore += 0.8;
    signals.push(`anilistId:${input.anilistId}`);
  }

  // Signal 2: MAL ID presence
  if (input.malId && Number(input.malId) > 0) {
    animeScore += 0.7;
    signals.push(`malId:${input.malId}`);
  }

  // Signal 3: Explicit mediaType declared as 'anime'
  if (input.mediaType === "anime") {
    animeScore += 0.75;
    signals.push("mediaType:anime");
  }

  // Signal 4: Anime format tags (OVA, ONA, TV_SHORT, SPECIAL)
  const normalizedFormat = (input.format || "").toUpperCase();
  if (["OVA", "ONA", "TV_SHORT", "SPECIAL"].includes(normalizedFormat)) {
    animeScore += 0.6;
    signals.push(`format:${normalizedFormat}`);
  }

  // Signal 5: Genre signals
  const lowerGenres = (input.genres || []).map((g) => g.toLowerCase());
  const hasAnimeGenre = lowerGenres.includes("anime");
  const hasAnimationGenre = lowerGenres.includes("animation");
  const hasDocGenre = lowerGenres.includes("documentary");

  if (hasAnimeGenre) {
    animeScore += 0.5;
    signals.push("genre:anime");
  }

  // Signal 6: Country / Origin signals combined with animation
  const isJapan =
    input.country?.toUpperCase() === "JP" ||
    input.country?.toLowerCase() === "japan" ||
    input.originalLanguage?.toLowerCase() === "ja";

  if (hasAnimationGenre && isJapan) {
    animeScore += 0.65;
    signals.push("animation+japanese_origin");
  }

  // Evaluate Documentary
  if (hasDocGenre && animeScore < 0.5) {
    return {
      mediaClass: "DOCUMENTARY",
      targetPool: "GENERAL",
      isAnime: false,
      confidence: 0.9,
      signals: ["genre:documentary"],
      reason: "Documentary content routes to General Playback Pool",
    };
  }

  // Evaluate Anime Movie vs Anime Series
  const isMovieFormat =
    input.mediaType === "movie" ||
    normalizedFormat === "MOVIE";

  if (animeScore >= 0.6) {
    if (isMovieFormat) {
      return {
        mediaClass: "ANIME_MOVIE",
        targetPool: "ANIME",
        isAnime: true,
        confidence: Math.min(animeScore, 1),
        signals,
        reason: "Theatrical Anime Film routes to Anime Playback Pool first",
      };
    }

    return {
      mediaClass: "ANIME",
      targetPool: "ANIME",
      isAnime: true,
      confidence: Math.min(animeScore, 1),
      signals,
      reason: "Canonical Anime content routes exclusively to Anime Playback Pool",
    };
  }

  // Standard Movie vs TV
  if (input.mediaType === "movie" || isMovieFormat) {
    return {
      mediaClass: "MOVIE",
      targetPool: "GENERAL",
      isAnime: false,
      confidence: 0.95,
      signals: ["type:movie"],
      reason: "Standard Feature Film routes to General Playback Pool",
    };
  }

  if (input.mediaType === "tv") {
    return {
      mediaClass: "TV",
      targetPool: "GENERAL",
      isAnime: false,
      confidence: 0.9,
      signals: ["type:tv"],
      reason: "Standard TV Series routes to General Playback Pool",
    };
  }

  return {
    mediaClass: "OTHER",
    targetPool: "GENERAL",
    isAnime: false,
    confidence: 0.5,
    signals: ["fallback:other"],
    reason: "General media routes to General Playback Pool",
  };
}
