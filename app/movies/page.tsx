import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChillerHero, HeroItem } from "@/components/video/ChillerHero";
import { MediaRail } from "@/components/video/MediaRail";
import {
  discoverMovies,
  getNowPlayingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getTrending,
} from "@/lib/tmdb/client";
import { getGenreNames } from "@/lib/tmdb/genres";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const [trendingRes, popularRes, nowPlayingRes, topRatedRes, actionRes, sciFiRes] = await Promise.allSettled([
    getTrending("movie", "week"),
    getPopularMovies(1),
    getNowPlayingMovies(1),
    getTopRatedMovies(1),
    discoverMovies({ with_genres: 28, sort_by: "popularity.desc" }),
    discoverMovies({ with_genres: 878, sort_by: "popularity.desc" }),
  ]);

  const trending = trendingRes.status === "fulfilled" ? trendingRes.value.results : [];
  const popular = popularRes.status === "fulfilled" ? popularRes.value.results : [];
  const nowPlaying = nowPlayingRes.status === "fulfilled" ? nowPlayingRes.value.results : [];
  const topRated = topRatedRes.status === "fulfilled" ? topRatedRes.value.results : [];
  const action = actionRes.status === "fulfilled" ? actionRes.value.results : [];
  const sciFi = sciFiRes.status === "fulfilled" ? sciFiRes.value.results : [];

  const heroItems: HeroItem[] = trending.slice(0, 5).map((m) => ({
    id: m.id,
    title: m.title || "Movie",
    overview: m.overview || "Experience world-class cinema on Chiller.",
    backdropPath: m.backdrop_path,
    posterPath: m.poster_path,
    mediaType: "movie",
    rating: Number(m.vote_average.toFixed(1)),
    releaseYear: (m.release_date || "").split("-")[0],
    genres: getGenreNames(m.genre_ids),
  }));

  const formatItems = (list: typeof trending) =>
    list.map((m) => ({
      id: m.id,
      title: m.title || "Untitled",
      posterPath: m.poster_path,
      backdropPath: m.backdrop_path,
      mediaType: "movie" as const,
      rating: m.vote_average,
      releaseYear: (m.release_date || "").split("-")[0],
      genres: getGenreNames(m.genre_ids),
    }));

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {heroItems.length > 0 && <ChillerHero items={heroItems} />}

        <MediaRail title="Trending Movies" items={formatItems(trending)} layout="backdrop" />
        <MediaRail title="Popular Movies" items={formatItems(popular)} layout="poster" />
        <MediaRail title="Now Playing in Theaters" items={formatItems(nowPlaying)} layout="poster" />
        <MediaRail title="Top Rated Movies" items={formatItems(topRated)} layout="poster" />
        <MediaRail title="Action Blockbusters" items={formatItems(action)} layout="poster" />
        <MediaRail title="Sci-Fi & Cyberpunk" items={formatItems(sciFi)} layout="poster" />
      </main>
    </div>
  );
}
