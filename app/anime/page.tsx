import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChillerHero, HeroItem } from "@/components/video/ChillerHero";
import { MediaRail } from "@/components/video/MediaRail";
import {
  getAnimeMovies,
  getPopularAnime,
  getTopRatedAnime,
  discoverTV,
} from "@/lib/tmdb/client";
import { getGenreNames } from "@/lib/tmdb/genres";

export const dynamic = "force-dynamic";

export default async function AnimePage() {
  const [popularAnimeRes, topRatedAnimeRes, animeMoviesRes, actionAnimeRes] = await Promise.allSettled([
    getPopularAnime(1),
    getTopRatedAnime(1),
    getAnimeMovies(1),
    discoverTV({
      with_genres: "16,10759",
      with_original_language: "ja",
      sort_by: "popularity.desc",
    }),
  ]);

  const popular = popularAnimeRes.status === "fulfilled" ? popularAnimeRes.value.results : [];
  const topRated = topRatedAnimeRes.status === "fulfilled" ? topRatedAnimeRes.value.results : [];
  const animeMovies = animeMoviesRes.status === "fulfilled" ? animeMoviesRes.value.results : [];
  const actionAnime = actionAnimeRes.status === "fulfilled" ? actionAnimeRes.value.results : [];

  const heroItems: HeroItem[] = popular.slice(0, 5).map((a) => ({
    id: a.id,
    title: a.name || a.title || "Anime Series",
    overview: a.overview || "Enter infinite worlds and epic battles on Chiller Anime.",
    backdropPath: a.backdrop_path,
    posterPath: a.poster_path,
    mediaType: "anime",
    rating: Number(a.vote_average.toFixed(1)),
    releaseYear: (a.first_air_date || a.release_date || "").split("-")[0],
    genres: getGenreNames(a.genre_ids),
  }));

  const formatItems = (list: typeof popular, defaultType: "anime" | "movie" = "anime") =>
    list.map((a) => ({
      id: a.id,
      title: a.name || a.title || "Untitled",
      posterPath: a.poster_path,
      backdropPath: a.backdrop_path,
      mediaType: defaultType,
      rating: a.vote_average,
      releaseYear: (a.first_air_date || a.release_date || "").split("-")[0],
      genres: getGenreNames(a.genre_ids),
    }));

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {heroItems.length > 0 && <ChillerHero items={heroItems} />}

        <MediaRail title="Trending & Popular Anime" items={formatItems(popular, "anime")} layout="backdrop" />
        <MediaRail title="Top Rated Anime Series" items={formatItems(topRated, "anime")} layout="poster" />
        <MediaRail title="Anime Feature Films" items={formatItems(animeMovies, "movie")} layout="poster" />
        <MediaRail title="Action & Shonen Anime" items={formatItems(actionAnime, "anime")} layout="poster" />
      </main>
    </div>
  );
}
