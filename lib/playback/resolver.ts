import { prisma } from "@/lib/prisma";
import { getMovieDetails, getSeasonDetails, getTVDetails, TmdbSeasonDetail } from "@/lib/tmdb/client";
import { selectBestOrigin } from "@/lib/origin-manager";
import { PlaybackCandidate, PlaybackSource } from "./types";
import { resolveCandidatesConcurrently } from "./orchestrator";
import { parseMediaSlug } from "./identity";
import { resolveAnimePlayback as resolveDedicatedAnimePlayback } from "./anime/anime-resolver";
import { classifyMedia } from "./media-classifier";

export interface PlaybackResolution {
  sourceType: "OWNED" | "EXTERNAL" | "UNAVAILABLE";
  provider: string;
  sources: PlaybackSource[];
  title: string;
  originalTitle?: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  releaseYear: string;
  genres: string[];
  rating: number;
  runtime?: number;
  mediaType: "movie" | "tv" | "anime" | "video";
  tmdbId?: number;
  anilistId?: number;

  // External primary embed
  embedUrl?: string;

  // TV / Anime Series specific
  season?: number;
  episode?: number;
  totalSeasons?: number;
  seasons?: { season_number: number; name: string; episode_count: number }[];
  currentSeasonDetails?: TmdbSeasonDetail;

  // Cast & crew
  cast?: { id: number; name: string; character: string; profile_path: string | null }[];
  recommendations?: any[];

  // Chiller-owned HLS specific
  streamUrl?: string;
  backupStreamUrls?: string[];
  subtitles?: { language: string; label: string; url: string }[];
  qualities?: { quality: string; bitrate?: number }[];
  videoId?: string;
  publicId?: string;

  // Error info if unavailable
  errorMessage?: string;
  startupLatencyMs?: number;
}

/**
 * Resolves movie candidates concurrently.
 */
export async function resolveMoviePlayback(
  tmdbId: number | string
): Promise<{ sources: PlaybackSource[]; primarySource: PlaybackSource | null; latencyMs?: number }> {
  const { candidates, primaryCandidate, fastestMs } = await resolveCandidatesConcurrently({
    mediaType: "movie",
    tmdbId,
  });

  return {
    sources: candidates,
    primarySource: primaryCandidate,
    latencyMs: fastestMs,
  };
}

/**
 * Resolves TV episode candidates concurrently.
 */
export async function resolveTVPlayback(
  tmdbId: number | string,
  season: number,
  episode: number
): Promise<{ sources: PlaybackSource[]; primarySource: PlaybackSource | null; latencyMs?: number }> {
  const { candidates, primaryCandidate, fastestMs } = await resolveCandidatesConcurrently({
    mediaType: "tv",
    tmdbId,
    season,
    episode,
  });

  return {
    sources: candidates,
    primarySource: primaryCandidate,
    latencyMs: fastestMs,
  };
}

/**
 * Resolves anime episode candidates concurrently using the dedicated ANIME PLAYBACK POOL.
 */
export async function resolveAnimePlayback(
  anilistId: number | string,
  episode: number,
  tmdbId?: number | string,
  options: { language?: "sub" | "dub"; preferredAudio?: string; title?: string } = {}
): Promise<{ sources: PlaybackSource[]; primarySource: PlaybackSource | null; latencyMs?: number }> {
  const result = await resolveDedicatedAnimePlayback({
    anilistId,
    tmdbId,
    episode,
    language: options.language,
    preferredAudio: options.preferredAudio,
    title: options.title,
  });

  return {
    sources: result.sources,
    primarySource: result.primarySource,
    latencyMs: result.latencyMs,
  };
}

export function parseSlug(slug: string | string[]) {
  return parseMediaSlug(slug);
}

/**
 * Primary content resolution service for the Chiller Watch experience.
 */
export async function resolveContent(
  slug: string | string[],
  options: { season?: number; episode?: number; language?: "sub" | "dub"; audio?: string } = {}
): Promise<PlaybackResolution | null> {
  const parsed = parseMediaSlug(slug);

  // 1. Resolve TMDB / AniList Content (Movie, TV, Anime)
  if (parsed) {
    const { mediaType } = parsed;
    const tmdbId = parsed.tmdbId || parsed.anilistId;
    if (!tmdbId) return null;

    const season = Math.max(1, options.season || parsed.season || 1);
    const episode = Math.max(1, options.episode || parsed.episode || 1);

    try {
      if (mediaType === "anime") {
        const { resolveAnimeAnilistId } = await import("@/lib/media/identity/id-mapper");
        const resolvedAnilistId = await resolveAnimeAnilistId({
          anilistId: parsed.anilistId,
          tmdbId: parsed.tmdbId,
          malId: parsed.malId,
          title: parsed.title,
        });

        const anilistIdToUse = resolvedAnilistId || parsed.anilistId || parsed.tmdbId;

        const { animeMetadataFabric } = await import("@/lib/media/anime/metadata-fabric");
        const anime = await animeMetadataFabric.getAnime({
          anilistId: anilistIdToUse,
          malId: parsed.malId,
          title: parsed.title,
        });

        const { sources, primarySource, latencyMs } = await resolveAnimePlayback(
          anilistIdToUse || "0",
          episode,
          parsed.tmdbId,
          { language: options.language, preferredAudio: options.audio, title: anime?.title }
        );

        const totalEpCount = Math.max(1, anime?.totalEpisodes || (anime as any)?.episodes || 12);
        const generatedEpisodes = Array.from({ length: totalEpCount }, (_, i) => ({
          id: i + 1,
          name: `Episode ${i + 1}`,
          overview: `Episode ${i + 1} of ${anime?.title || "series"}`,
          episode_number: i + 1,
          season_number: 1,
          still_path: anime?.backdropUrl || anime?.posterUrl || null,
          vote_average: anime?.rating || 8.0,
        }));

        const animeSeasonDetails = {
          _id: `anime-${anilistIdToUse}-s1`,
          id: 1,
          name: "Season 1",
          overview: anime?.overview || "",
          poster_path: anime?.posterUrl || null,
          season_number: 1,
          episodes: generatedEpisodes,
        };

        const animeSeasons = [
          {
            season_number: 1,
            name: "Season 1",
            episode_count: totalEpCount,
          },
        ];

        return {
          sourceType: sources.length > 0 ? "EXTERNAL" : "UNAVAILABLE",
          provider: primarySource ? primarySource.providerId : "none",
          sources,
          title: anime?.title || `Anime #${parsed.anilistId}`,
          originalTitle: (anime as any)?.nativeTitle || anime?.originalTitle,
          overview: anime?.overview || "No description provided.",
          posterUrl: anime?.posterUrl || "/placeholder-poster.png",
          backdropUrl: anime?.backdropUrl || "",
          releaseYear: anime?.year || (anime?.releaseDate ? anime.releaseDate.split("-")[0] : ""),
          genres: anime?.genres || ["Animation", "Anime"],
          rating: anime?.rating || 0,
          mediaType: "anime",
          anilistId: parsed.anilistId,
          tmdbId: parsed.tmdbId,
          season: 1,
          episode,
          totalSeasons: 1,
          seasons: animeSeasons,
          currentSeasonDetails: animeSeasonDetails as any,
          embedUrl: primarySource?.url,
          recommendations: [],
          startupLatencyMs: latencyMs,
          errorMessage: sources.length === 0 ? "Playback is currently unavailable." : undefined,
        };
      }

      if (mediaType === "movie") {
        // Parallel metadata and candidate resolution (fault-tolerant)
        const [movieRes, playbackRes] = await Promise.allSettled([
          getMovieDetails(tmdbId),
          resolveMoviePlayback(tmdbId),
        ]);

        const movie = movieRes.status === "fulfilled" ? movieRes.value : null;
        const playbackData = playbackRes.status === "fulfilled" ? playbackRes.value : { sources: [], primarySource: null, latencyMs: 0 };
        const { sources, primarySource, latencyMs } = playbackData;

        return {
          sourceType: sources.length > 0 ? "EXTERNAL" : "UNAVAILABLE",
          provider: primarySource ? primarySource.providerId : "none",
          sources,
          title: movie?.title || movie?.name || "Untitled Movie",
          originalTitle: movie?.original_title,
          overview: movie?.overview || "No description provided.",
          posterUrl: movie?.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : "/placeholder-poster.png",
          backdropUrl: movie?.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : "",
          releaseYear: movie?.release_date ? movie.release_date.split("-")[0] : "",
          genres: movie?.genres?.map((g) => g.name) || [],
          rating: movie?.vote_average ? Number(movie.vote_average.toFixed(1)) : 0,
          runtime: movie?.runtime,
          mediaType: "movie",
          tmdbId,
          embedUrl: primarySource?.url,
          cast: movie?.credits?.cast?.slice(0, 10),
          recommendations: (movie?.recommendations?.results || movie?.similar?.results || []).slice(0, 10),
          startupLatencyMs: latencyMs,
          errorMessage: sources.length === 0 ? "Playback is currently unavailable." : undefined,
        };
      } else {
        // TV / Anime Series: Parallel metadata, season details, and candidate resolution
        const [tv, playbackRes, seasonRes] = await Promise.allSettled([
          getTVDetails(tmdbId),
          resolveTVPlayback(tmdbId, season, episode),
          getSeasonDetails(tmdbId, season),
        ]);

        const tvData = tv.status === "fulfilled" ? tv.value : null;
        const playbackData = playbackRes.status === "fulfilled" ? playbackRes.value : { sources: [], primarySource: null, latencyMs: 0 };
        const currentSeasonDetails = seasonRes.status === "fulfilled" ? seasonRes.value : undefined;

        let { sources, primarySource, latencyMs } = playbackData;

        // If no sources and no tvData, only then return null
        if (!tvData && sources.length === 0) return null;

        // If Japanese animation, also fetch anime candidates concurrently
        const isAnime = Boolean(
          tvData &&
          (tvData as any).original_language === "ja" &&
          tvData.genres?.some((g) => g.id === 16 || g.name === "Animation")
        );

        if (isAnime && parsed.anilistId) {
          const animeRes = await resolveAnimePlayback(parsed.anilistId, episode, tmdbId);
          if (animeRes.sources.length > 0) {
            const existingUrls = new Set(sources.map((s) => s.url));
            const newSources = animeRes.sources.filter((s) => !existingUrls.has(s.url));
            sources = [...newSources, ...sources].sort(
              (a, b) => (b.score ?? 0) - (a.score ?? 0) || a.priority - b.priority
            );
            primarySource = sources[0] || primarySource;
          }
        }

        const filteredSeasons = (tvData?.seasons || [])
          .filter((s) => s.season_number > 0)
          .map((s) => ({
            season_number: s.season_number,
            name: s.name,
            episode_count: s.episode_count,
          }));

        return {
          sourceType: sources.length > 0 ? "EXTERNAL" : "UNAVAILABLE",
          provider: primarySource ? primarySource.providerId : "none",
          sources,
          title: tvData?.name || tvData?.title || `Series #${tmdbId}`,
          originalTitle: tvData?.original_name,
          overview: tvData?.overview || "No description provided.",
          posterUrl: tvData?.poster_path ? `https://image.tmdb.org/t/p/w780${tvData.poster_path}` : "/placeholder-poster.png",
          backdropUrl: tvData?.backdrop_path ? `https://image.tmdb.org/t/p/original${tvData.backdrop_path}` : "",
          releaseYear: tvData?.first_air_date ? tvData.first_air_date.split("-")[0] : "",
          genres: tvData?.genres?.map((g) => g.name) || [],
          rating: tvData?.vote_average ? Number(tvData.vote_average.toFixed(1)) : 0,
          mediaType: isAnime ? "anime" : "tv",
          tmdbId,
          anilistId: parsed.anilistId,
          season,
          episode,
          totalSeasons: tvData?.number_of_seasons || filteredSeasons.length || 1,
          seasons: filteredSeasons,
          currentSeasonDetails,
          embedUrl: primarySource?.url,
          cast: tvData?.credits?.cast?.slice(0, 10),
          recommendations: (tvData?.recommendations?.results || tvData?.similar?.results || []).slice(0, 10),
          startupLatencyMs: latencyMs,
          errorMessage: sources.length === 0 ? "Playback is currently unavailable." : undefined,
        };
      }
    } catch (err: any) {
      if (err.message === "TMDB_NOT_FOUND") {
        return null;
      }
      return {
        sourceType: "UNAVAILABLE",
        provider: "none",
        sources: [],
        title: "Content Unavailable",
        overview: "The content information could not be retrieved. Please check API settings.",
        posterUrl: "/placeholder-poster.png",
        backdropUrl: "",
        releaseYear: "",
        genres: [],
        rating: 0,
        mediaType: mediaType,
        tmdbId,
        errorMessage:
          err.message === "TMDB_NOT_CONFIGURED"
            ? "TMDB API credentials are not configured. Please configure them in /admin/settings."
            : "Content information is temporarily unavailable.",
      };
    }
  }

  // 2. Fallback check for Chiller-Owned Video (Prisma DB)
  try {
    const video = await prisma.video.findUnique({
      where: { slug: Array.isArray(slug) ? slug[0] : slug },
      include: {
        category: true,
        variants: true,
        subtitles: true,
      },
    });

    if (video) {
      const manifest = await selectBestOrigin(video.id);
      const streamUrl = manifest?.streamUrl || video.hlsMasterUrl || video.fallbackMp4Url || "";
      const isReady = video.status === "READY" && Boolean(streamUrl);

      const ownedSource: PlaybackSource = {
        providerId: "chiller-owned",
        providerName: "Chiller Direct HLS",
        type: "hls",
        url: streamUrl,
        available: isReady,
        priority: 0,
        statusText: "Direct HLS Stream",
      };

      return {
        sourceType: isReady ? "OWNED" : "UNAVAILABLE",
        provider: isReady ? "chiller" : "none",
        sources: isReady ? [ownedSource] : [],
        title: video.title,
        overview: video.description || "",
        posterUrl: video.thumbnailUrl,
        backdropUrl: video.backdropUrl || "",
        releaseYear: new Date(video.createdAt).getFullYear().toString(),
        genres: video.category ? [video.category.name] : [],
        rating: 0,
        runtime: Math.floor(video.duration / 60),
        mediaType: "video",
        streamUrl,
        backupStreamUrls: manifest?.backupStreamUrls || [],
        subtitles: video.subtitles,
        qualities: video.variants.map((v) => ({ quality: v.quality, bitrate: v.bitrate })),
        videoId: video.id,
        publicId: video.publicId,
        errorMessage: !isReady ? "Video encoding in progress or stream unavailable." : undefined,
      };
    }
  } catch {
    // Ignore DB error
  }

  return null;
}
