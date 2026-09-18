import { prisma } from "@/lib/prisma";
import { getMovieDetails, getSeasonDetails, getTVDetails, TmdbMediaItem, TmdbSeasonDetail } from "@/lib/tmdb/client";
import { playbackRegistry } from "./registry";
import { PlaybackSource } from "./types";
import { selectBestOrigin } from "@/lib/origin-manager";

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
}

/**
 * Timeout wrapper for provider operations.
 * Returns null on timeout — never throws. Provider iteration always continues.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T | null> {
  let timeoutHandle: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch {
    clearTimeout(timeoutHandle!);
    return null;
  }
}

/**
 * CHILLER PLAYBACK RESOLUTION FLOW — MOVIES
 *
 * 1. Iterate ALL enabled providers regardless of previous health state
 * 2. Each provider generates a candidate URL (server-side build only; no HTTP probe)
 * 3. Return all candidates sorted by priority
 * 4. Browser loads iframes one-by-one; postMessage events advance lifecycle:
 *    DISCOVERED → IFRAME_LOADED → PLAYER_READY → PLAY_STARTED
 *    or DISCOVERED → IFRAME_LOADED → PLAYBACK_ERROR (triggers auto-fallback)
 *
 * A provider failing to generate a URL does NOT stop iteration.
 * HTTP 429 / timeouts do NOT remove a provider from this list.
 */
export async function resolveMoviePlayback(
  tmdbId: number | string
): Promise<{ sources: PlaybackSource[]; primarySource: PlaybackSource | null }> {
  const providers = playbackRegistry.getEnabledProviders();
  const sources: PlaybackSource[] = [];

  for (const provider of providers) {
    if (!provider.supportsMovie) continue;

    try {
      const source = await withTimeout(provider.getMoviePlayback(tmdbId), 6000);
      if (source && source.url) {
        // Mark all resolver-built sources as DISCOVERED (not yet browser-verified)
        sources.push({ ...source, available: true, status: source.status ?? "DISCOVERED" });
      }
    } catch {
      // Isolated — this provider's failure does not halt other providers
    }
  }

  sources.sort((a, b) => a.priority - b.priority);
  return { sources, primarySource: sources[0] ?? null };
}

/**
 * CHILLER PLAYBACK RESOLUTION FLOW — TV EPISODES
 *
 * season and episode are always passed separately to each provider.
 * CineSrc uses query params: ?s={season}&e={episode}
 * VidSrc uses path routing: /embed/tv/{id}/{season}/{episode}
 * Both are handled inside their respective provider adapters.
 */
export async function resolveTVPlayback(
  tmdbId: number | string,
  season: number,
  episode: number
): Promise<{ sources: PlaybackSource[]; primarySource: PlaybackSource | null }> {
  const s = Math.max(1, season || 1);
  const e = Math.max(1, episode || 1);
  const providers = playbackRegistry.getEnabledProviders();
  const sources: PlaybackSource[] = [];

  for (const provider of providers) {
    if (!provider.supportsTV) continue;

    try {
      const source = await withTimeout(provider.getTVPlayback(tmdbId, s, e), 6000);
      if (source && source.url) {
        sources.push({ ...source, available: true, status: source.status ?? "DISCOVERED", season: s, episode: e });
      }
    } catch {
      // Isolated — this provider's failure does not halt other providers
    }
  }

  sources.sort((a, b) => a.priority - b.priority);
  return { sources, primarySource: sources[0] ?? null };
}

/**
 * Resolves all available playback sources for Anime using AniList ID and episode number
 */
export async function resolveAnimePlayback(
  anilistId: number | string,
  episode: number
): Promise<{ sources: PlaybackSource[]; primarySource: PlaybackSource | null }> {
  const providers = playbackRegistry.getEnabledProviders();
  const sources: PlaybackSource[] = [];

  for (const provider of providers) {
    if (!provider.supportsAnime || !provider.getAnimePlayback) continue;

    try {
      const source = await withTimeout(provider.getAnimePlayback(anilistId, episode), 6000);
      if (source && source.available && source.url) {
        sources.push(source);
        playbackRegistry.recordSuccess(provider.id);
      }
    } catch (err: any) {
      playbackRegistry.recordFailure(provider.id, err.message || "Anime resolution error");
    }
  }

  sources.sort((a, b) => a.priority - b.priority);

  return {
    sources,
    primarySource: sources.length > 0 ? sources[0] : null,
  };
}

/**
 * Parses a watch slug into type and ID.
 */
export function parseSlug(slug: string): {
  type: "movie" | "tv" | "anime";
  tmdbId?: number;
  anilistId?: number;
} | null {
  if (slug.startsWith("anime-")) {
    const id = parseInt(slug.replace("anime-", ""), 10);
    return isNaN(id) ? null : { type: "anime", anilistId: id, tmdbId: id };
  }
  if (slug.startsWith("movie-")) {
    const id = parseInt(slug.replace("movie-", ""), 10);
    return isNaN(id) ? null : { type: "movie", tmdbId: id };
  }
  if (slug.startsWith("tv-")) {
    const id = parseInt(slug.replace("tv-", ""), 10);
    return isNaN(id) ? null : { type: "tv", tmdbId: id };
  }
  if (/^\d+$/.test(slug)) {
    const id = parseInt(slug, 10);
    return { type: "movie", tmdbId: id };
  }
  return null;
}

/**
 * Primary content resolution service for the Chiller Watch experience.
 */
export async function resolveContent(
  slug: string,
  options: { season?: number; episode?: number } = {}
): Promise<PlaybackResolution | null> {
  const parsed = parseSlug(slug);

  // 1. Resolve TMDB Content (Movie or TV / Anime)
  if (parsed) {
    const { type } = parsed;
    const tmdbId = parsed.tmdbId || parsed.anilistId;
    if (!tmdbId) return null;

    const season = Math.max(1, options.season || 1);
    const episode = Math.max(1, options.episode || 1);

    try {
      if (type === "anime" && parsed.anilistId) {
        const { AniListContentProvider } = await import("@/lib/content/providers/anilist");
        const anilistProvider = new AniListContentProvider();
        const anime = await anilistProvider.getAnime(parsed.anilistId);

        if (anime) {
          const { sources, primarySource } = await resolveAnimePlayback(parsed.anilistId, episode);
          return {
            sourceType: sources.length > 0 ? "EXTERNAL" : "UNAVAILABLE",
            provider: primarySource ? primarySource.providerId : "none",
            sources,
            title: anime.title,
            originalTitle: (anime as any).nativeTitle,
            overview: anime.overview || "No description provided.",
            posterUrl: anime.posterUrl || "/placeholder-poster.png",
            backdropUrl: anime.backdropUrl || "",
            releaseYear: anime.year || (anime.releaseDate ? anime.releaseDate.split("-")[0] : ""),
            genres: anime.genres || [],
            rating: anime.rating || 0,
            mediaType: "anime",
            anilistId: parsed.anilistId,
            season: 1,
            episode,
            totalSeasons: 1,
            embedUrl: primarySource?.url,
            recommendations: [],
            errorMessage: sources.length === 0 ? "Playback is currently unavailable." : undefined,
          };
        }
      }

      if (type === "movie") {
        const movie = await getMovieDetails(tmdbId);
        const { sources, primarySource } = await resolveMoviePlayback(tmdbId);

        return {
          sourceType: sources.length > 0 ? "EXTERNAL" : "UNAVAILABLE",
          provider: primarySource ? primarySource.providerId : "none",
          sources,
          title: movie.title || movie.name || "Untitled Movie",
          originalTitle: movie.original_title,
          overview: movie.overview || "No description provided.",
          posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : "/placeholder-poster.png",
          backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : "",
          releaseYear: movie.release_date ? movie.release_date.split("-")[0] : "",
          genres: movie.genres?.map((g) => g.name) || [],
          rating: Number(movie.vote_average.toFixed(1)),
          runtime: movie.runtime,
          mediaType: "movie",
          tmdbId,
          embedUrl: primarySource?.url,
          cast: movie.credits?.cast?.slice(0, 10),
          recommendations: (movie.recommendations?.results || movie.similar?.results || []).slice(0, 10),
          errorMessage: sources.length === 0 ? "Playback is currently unavailable." : undefined,
        };
      } else {
        // TV / Anime Series
        const tv = await getTVDetails(tmdbId);
        let { sources, primarySource } = await resolveTVPlayback(tmdbId, season, episode);

        // If anime (Japanese animation or anime slug), also resolve NHD Anime source
        const isAnime = type === "anime" || ((tv as any).original_language === "ja" && tv.genres?.some((g) => g.id === 16 || g.name === "Animation"));
        if (isAnime) {
          const anilistId = parsed.anilistId;
          if (anilistId) {
            const animeRes = await resolveAnimePlayback(anilistId, episode);
            if (animeRes.sources.length > 0) {
              // Combine and prioritize anime-specific sources
              const existingUrls = new Set(sources.map((s) => s.url));
              const newSources = animeRes.sources.filter((s) => !existingUrls.has(s.url));
              sources = [...newSources, ...sources].sort((a, b) => a.priority - b.priority);
              primarySource = sources[0] || primarySource;
            }
          }
        }

        // Fetch Season details for episode picker
        let currentSeasonDetails: TmdbSeasonDetail | undefined;
        try {
          currentSeasonDetails = await getSeasonDetails(tmdbId, season);
        } catch {
          // If season detail fails, proceed with basic season info
        }

        const filteredSeasons = (tv.seasons || [])
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
          title: tv.name || tv.title || "Untitled Series",
          originalTitle: tv.original_name,
          overview: tv.overview || "No description provided.",
          posterUrl: tv.poster_path ? `https://image.tmdb.org/t/p/w780${tv.poster_path}` : "/placeholder-poster.png",
          backdropUrl: tv.backdrop_path ? `https://image.tmdb.org/t/p/original${tv.backdrop_path}` : "",
          releaseYear: tv.first_air_date ? tv.first_air_date.split("-")[0] : "",
          genres: tv.genres?.map((g) => g.name) || [],
          rating: Number(tv.vote_average.toFixed(1)),
          mediaType: "tv",
          tmdbId,
          season,
          episode,
          totalSeasons: tv.number_of_seasons || filteredSeasons.length || 1,
          seasons: filteredSeasons,
          currentSeasonDetails,
          embedUrl: primarySource?.url,
          cast: tv.credits?.cast?.slice(0, 10),
          recommendations: (tv.recommendations?.results || tv.similar?.results || []).slice(0, 10),
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
        mediaType: type,
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
      where: { slug },
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
