import { MetadataRoute } from "next";
import { getCanonicalUrl } from "@/lib/config/site";
import { GENRE_SLUG_MAP } from "@/lib/content/discovery";
import { getPopularMovies, getPopularTV, getTrending } from "@/lib/tmdb/client";

export const dynamic = "force-dynamic";
export const revalidate = 86400; // Cache sitemap for 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1. Static Core Public Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: getCanonicalUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: getCanonicalUrl("/movies"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: getCanonicalUrl("/series"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: getCanonicalUrl("/anime"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: getCanonicalUrl("/trending"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: getCanonicalUrl("/top-rated"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: getCanonicalUrl("/upcoming"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: getCanonicalUrl("/new"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: getCanonicalUrl("/trailers"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: getCanonicalUrl("/categories"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: getCanonicalUrl("/kdrama"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: getCanonicalUrl("/cdrama"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: getCanonicalUrl("/kids"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: getCanonicalUrl("/documentaries"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: getCanonicalUrl("/terms"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: getCanonicalUrl("/privacy"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // 2. Genre Exploration Pages
  const genreRoutes: MetadataRoute.Sitemap = Object.keys(GENRE_SLUG_MAP).map((slug) => ({
    url: getCanonicalUrl(`/genre/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 3. Dynamic Public Detail Pages (Movies, TV Shows, Anime)
  const dynamicRoutes: MetadataRoute.Sitemap = [];
  const visitedUrls = new Set<string>();

  const addRoute = (path: string, priority = 0.8, changeFrequency: "daily" | "weekly" = "weekly") => {
    const url = getCanonicalUrl(path);
    if (!visitedUrls.has(url)) {
      visitedUrls.add(url);
      dynamicRoutes.push({
        url,
        lastModified: now,
        changeFrequency,
        priority,
      });
    }
  };

  try {
    // Timeout guard so sitemap generation never hangs or blocks the build
    const fetchWithTimeout = <T>(promise: Promise<T>, ms = 4000): Promise<T | null> =>
      Promise.race([
        promise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]).catch(() => null);

    const [popularMovies, popularTv, trendingAll] = await Promise.all([
      fetchWithTimeout(getPopularMovies(1)),
      fetchWithTimeout(getPopularTV(1)),
      fetchWithTimeout(getTrending("all", "week")),
    ]);

    // Popular Movies -> /movie/[id]
    if (popularMovies && Array.isArray(popularMovies.results)) {
      for (const item of popularMovies.results.slice(0, 40)) {
        if (item.id) addRoute(`/movie/${item.id}`, 0.85);
      }
    }

    // Popular TV Series -> /tv/[id]
    if (popularTv && Array.isArray(popularTv.results)) {
      for (const item of popularTv.results.slice(0, 40)) {
        if (item.id) {
          const isAnime =
            (item.original_language === "ja" || (item.origin_country || []).includes("JP")) &&
            (item.genre_ids || []).includes(16);
          if (isAnime) {
            addRoute(`/anime/${item.id}`, 0.85);
          } else {
            addRoute(`/tv/${item.id}`, 0.85);
          }
        }
      }
    }

    // Trending Mixed -> /movie/[id], /tv/[id], /anime/[id]
    if (trendingAll && Array.isArray(trendingAll.results)) {
      for (const item of trendingAll.results.slice(0, 40)) {
        if (!item.id) continue;
        const isAnime =
          (item.original_language === "ja" || (item.origin_country || []).includes("JP")) &&
          (item.genre_ids || []).includes(16);

        if (isAnime) {
          addRoute(`/anime/${item.id}`, 0.85);
        } else if (item.media_type === "tv") {
          addRoute(`/tv/${item.id}`, 0.85);
        } else {
          addRoute(`/movie/${item.id}`, 0.85);
        }
      }
    }
  } catch {
    // If external APIs fail or are offline, graceful fallback preserves sitemap integrity
  }

  // Guaranteed fallback popular content IDs for search crawlers in offline/cold-start states
  if (dynamicRoutes.length === 0) {
    // Evergreen popular movie IDs
    const fallbackMovieIds = [550, 27205, 157336, 155, 680, 299536, 19995, 24428, 424, 769];
    // Evergreen popular TV IDs
    const fallbackTvIds = [1399, 66732, 1396, 60059, 100088, 94605, 84773, 71446];
    // Evergreen popular anime IDs
    const fallbackAnimeIds = [16498, 1429, 31964, 85937, 85990, 80752, 92685];

    for (const id of fallbackMovieIds) addRoute(`/movie/${id}`, 0.8);
    for (const id of fallbackTvIds) addRoute(`/tv/${id}`, 0.8);
    for (const id of fallbackAnimeIds) addRoute(`/anime/${id}`, 0.8);
  }

  return [...staticRoutes, ...genreRoutes, ...dynamicRoutes];
}
