import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChillerHero, HeroItem } from "@/components/video/ChillerHero";
import { MediaRail } from "@/components/video/MediaRail";
import {
  discoverTV,
  getPopularTV,
  getTopRatedTV,
  getTrending,
} from "@/lib/tmdb/client";
import { getGenreNames } from "@/lib/tmdb/genres";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const [trendingRes, popularRes, topRatedRes, dramaRes, scifiRes] = await Promise.allSettled([
    getTrending("tv", "week"),
    getPopularTV(1),
    getTopRatedTV(1),
    discoverTV({ with_genres: 18, sort_by: "popularity.desc" }),
    discoverTV({ with_genres: 10765, sort_by: "popularity.desc" }),
  ]);

  const trending = trendingRes.status === "fulfilled" ? trendingRes.value.results : [];
  const popular = popularRes.status === "fulfilled" ? popularRes.value.results : [];
  const topRated = topRatedRes.status === "fulfilled" ? topRatedRes.value.results : [];
  const drama = dramaRes.status === "fulfilled" ? dramaRes.value.results : [];
  const scifi = scifiRes.status === "fulfilled" ? scifiRes.value.results : [];

  const heroItems: HeroItem[] = trending.slice(0, 5).map((s) => ({
    id: s.id,
    title: s.name || "TV Series",
    overview: s.overview || "Stream binge-worthy series and addictive seasons on Chiller.",
    backdropPath: s.backdrop_path,
    posterPath: s.poster_path,
    mediaType: "tv",
    rating: Number(s.vote_average.toFixed(1)),
    releaseYear: (s.first_air_date || "").split("-")[0],
    genres: getGenreNames(s.genre_ids),
  }));

  const formatItems = (list: typeof trending) =>
    list.map((s) => ({
      id: s.id,
      title: s.name || "Untitled",
      posterPath: s.poster_path,
      backdropPath: s.backdrop_path,
      mediaType: "tv" as const,
      rating: s.vote_average,
      releaseYear: (s.first_air_date || "").split("-")[0],
      genres: getGenreNames(s.genre_ids),
    }));

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {heroItems.length > 0 && <ChillerHero items={heroItems} />}

        <MediaRail title="Trending TV Shows" items={formatItems(trending)} layout="backdrop" />
        <MediaRail title="Popular Series" items={formatItems(popular)} layout="poster" />
        <MediaRail title="Critically Acclaimed & Top Rated" items={formatItems(topRated)} layout="poster" />
        <MediaRail title="Gripping Drama Series" items={formatItems(drama)} layout="poster" />
        <MediaRail title="Sci-Fi & Fantasy Series" items={formatItems(scifi)} layout="poster" />
      </main>
    </div>
  );
}
