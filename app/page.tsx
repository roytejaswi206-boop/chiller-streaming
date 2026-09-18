import React from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChillerHero, HeroItem } from "@/components/video/ChillerHero";
import { MediaRail } from "@/components/video/MediaRail";
import {
  getPopularAnime,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTrending,
} from "@/lib/tmdb/client";
import { getGenreNames } from "@/lib/tmdb/genres";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fetch real content from TMDB with settled promises for fault tolerance
  const [trendingRes, moviesRes, animeRes, seriesRes, topRatedRes] = await Promise.allSettled([
    getTrending("all", "week"),
    getPopularMovies(1),
    getPopularAnime(1),
    getPopularTV(1),
    getTopRatedMovies(1),
  ]);

  const trendingItems = trendingRes.status === "fulfilled" ? trendingRes.value.results : [];
  const popularMovies = moviesRes.status === "fulfilled" ? moviesRes.value.results : [];
  const popularAnime = animeRes.status === "fulfilled" ? animeRes.value.results : [];
  const popularSeries = seriesRes.status === "fulfilled" ? seriesRes.value.results : [];
  const topRatedMovies = topRatedRes.status === "fulfilled" ? topRatedRes.value.results : [];

  const isConfigured =
    trendingItems.length > 0 ||
    popularMovies.length > 0 ||
    popularAnime.length > 0 ||
    popularSeries.length > 0;

  // Format Hero Slides from top trending items
  const heroItems: HeroItem[] = trendingItems.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title || item.name || "Featured Title",
    overview: item.overview || "Discover unforgettable stories on Chiller.",
    backdropPath: item.backdrop_path,
    posterPath: item.poster_path,
    mediaType: item.media_type === "tv" ? "tv" : "movie",
    rating: Number(item.vote_average.toFixed(1)),
    releaseYear: (item.release_date || item.first_air_date || "").split("-")[0],
    genres: getGenreNames(item.genre_ids),
  }));

  // Format rail items
  const formatRailItems = (items: typeof trendingItems, defaultType: "movie" | "tv" | "anime") =>
    items.map((item) => ({
      id: item.id,
      title: item.title || item.name || "Untitled",
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      mediaType: (item.media_type as any) || defaultType,
      rating: item.vote_average,
      releaseYear: (item.release_date || item.first_air_date || "").split("-")[0],
      genres: getGenreNames(item.genre_ids),
    }));

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Streaming & Discovery Canvas */}
      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {/* If TMDB is not yet configured, show quick setup guide */}
        {!isConfigured ? (
          <div className="rounded-3xl border border-white/10 bg-[#0F172A] p-8 lg:p-12 text-center max-w-2xl mx-auto my-12 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#FF3B6B] to-[#8A5CFF] text-white text-2xl font-black flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#FF3B6B]/25">
              C
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mb-2">
              Welcome to CHILLER
            </h1>
            <p className="text-sm font-semibold text-[#FF3B6B] uppercase tracking-widest mb-4">
              JUST CHILL.
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed mb-8">
              Chiller is ready to stream. To automatically populate movies, anime, TV series, and enable playback, configure your <strong>TMDB</strong> and <strong>CodeSpecter</strong> API keys in the settings dashboard.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/admin/settings"
                className="px-6 py-3 rounded-full bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/30"
              >
                Configure API Keys in Settings
              </Link>
              <Link
                href="/movies"
                className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold transition"
              >
                Browse Catalog
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Cinematic Hero Section */}
            {heroItems.length > 0 && <ChillerHero items={heroItems} />}

            {/* 2. Trending Now Rail */}
            <MediaRail
              title="Trending Now"
              items={formatRailItems(trendingItems, "movie")}
              seeAllHref="/trending"
              layout="backdrop"
            />

            {/* 3. Popular Movies Rail */}
            <MediaRail
              title="Popular Movies"
              items={formatRailItems(popularMovies, "movie")}
              seeAllHref="/movies"
              layout="poster"
            />

            {/* 4. Popular Anime Rail */}
            <MediaRail
              title="Popular Anime"
              items={formatRailItems(popularAnime, "anime")}
              seeAllHref="/anime"
              layout="poster"
            />

            {/* 5. Popular Series Rail */}
            <MediaRail
              title="Popular Series"
              items={formatRailItems(popularSeries, "tv")}
              seeAllHref="/series"
              layout="poster"
            />

            {/* 6. Top Rated Movies Rail */}
            <MediaRail
              title="Top Rated"
              items={formatRailItems(topRatedMovies, "movie")}
              seeAllHref="/movies"
              layout="poster"
            />
          </>
        )}
      </main>
    </div>
  );
}
