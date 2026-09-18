import { ChillerContent, ContentType, ExternalIds } from "./types";
import { TmdbMediaItem, TmdbSeasonDetail } from "@/lib/tmdb/client";

/**
 * Normalizes TMDB Media item to ChillerContent
 */
export function normalizeTmdbItem(
  item: TmdbMediaItem,
  overrideType?: ContentType
): ChillerContent {
  const isMovie = overrideType ? overrideType === "movie" : item.media_type === "movie" || Boolean(item.title);
  const type: ContentType = overrideType || (isMovie ? "movie" : "tv");
  const title = item.title || item.name || "Untitled";
  const releaseDate = item.release_date || item.first_air_date || "";
  const year = releaseDate ? releaseDate.split("-")[0] : "";

  return {
    id: `tmdb-${type}-${item.id}`,
    type,
    title,
    originalTitle: item.original_title || item.original_name,
    overview: item.overview || "No description provided.",
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : "/placeholder-poster.png",
    backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : "",
    releaseDate,
    year,
    genres: item.genres?.map((g) => g.name) || [],
    languages: [],
    rating: Number(item.vote_average.toFixed(1)),
    popularity: item.popularity,
    runtime: item.runtime,
    externalIds: {
      tmdbId: item.id,
    },
    totalSeasons: item.number_of_seasons,
    totalEpisodes: item.number_of_episodes,
    cast: item.credits?.cast?.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w300${c.profile_path}` : null,
    })),
    primarySource: "tmdb",
    enrichedSources: ["tmdb"],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Enriches existing ChillerContent with AniList anime metadata
 */
export function enrichWithAniList(
  target: ChillerContent,
  aniListData: any
): ChillerContent {
  if (!aniListData) return target;

  const enriched = { ...target };
  enriched.externalIds = {
    ...enriched.externalIds,
    anilistId: aniListData.id,
    malId: aniListData.idMal || enriched.externalIds.malId,
  };

  enriched.romajiTitle = aniListData.title?.romaji || enriched.romajiTitle;
  enriched.englishTitle = aniListData.title?.english || enriched.englishTitle;
  enriched.nativeTitle = aniListData.title?.native || enriched.nativeTitle;

  if (aniListData.title?.english && !enriched.alternativeTitles?.includes(aniListData.title.english)) {
    enriched.alternativeTitles = [...(enriched.alternativeTitles || []), aniListData.title.english];
  }

  if (aniListData.genres && Array.isArray(aniListData.genres)) {
    const combined = Array.from(new Set([...enriched.genres, ...aniListData.genres]));
    enriched.genres = combined;
  }

  if (aniListData.studios?.nodes && Array.isArray(aniListData.studios.nodes)) {
    enriched.studios = aniListData.studios.nodes.map((s: any) => s.name);
  }

  if (aniListData.format) {
    enriched.format = aniListData.format;
  }

  if (aniListData.season) {
    enriched.animeSeason = `${aniListData.season} ${aniListData.seasonYear || ""}`.trim();
  }

  if (!enriched.enrichedSources.includes("anilist")) {
    enriched.enrichedSources.push("anilist");
  }

  return enriched;
}

/**
 * Enriches existing ChillerContent with TVmaze metadata & external IDs
 */
export function enrichWithTvmaze(
  target: ChillerContent,
  tvmazeData: any
): ChillerContent {
  if (!tvmazeData) return target;

  const enriched = { ...target };
  enriched.externalIds = {
    ...enriched.externalIds,
    tvmazeId: tvmazeData.id,
    imdbId: tvmazeData.externals?.imdb || enriched.externalIds.imdbId,
    tvdbId: tvmazeData.externals?.thetvdb || enriched.externalIds.tvdbId,
  };

  if (tvmazeData.network?.country?.name) {
    enriched.country = tvmazeData.network.country.name;
  } else if (tvmazeData.webChannel?.country?.name) {
    enriched.country = tvmazeData.webChannel.country.name;
  }

  if (tvmazeData.language && !enriched.languages.includes(tvmazeData.language)) {
    enriched.languages = [...enriched.languages, tvmazeData.language];
  }

  if (tvmazeData.status) {
    enriched.status = tvmazeData.status;
  }

  if (!enriched.enrichedSources.includes("tvmaze")) {
    enriched.enrichedSources.push("tvmaze");
  }

  return enriched;
}
