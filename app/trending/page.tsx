import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaCard } from "@/components/video/MediaCard";
import { getTrending } from "@/lib/tmdb/client";
import { getGenreNames } from "@/lib/tmdb/genres";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  let trendingItems: any[] = [];
  try {
    const res = await getTrending("all", "week");
    trendingItems = res.results || [];
  } catch {
    // Graceful fallback if TMDB not configured
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF3B6B] uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#FF3B6B] animate-pulse" />
            Live Global Charts
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Trending on Chiller
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
            The most popular movies, anime, and series capturing audiences worldwide this week.
          </p>
        </div>

        {trendingItems.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-12 text-center max-w-md mx-auto my-12">
            <p className="text-sm font-semibold text-white mb-2">No trending stories loaded</p>
            <p className="text-xs text-zinc-400">
              Please verify that your TMDB API credentials are configured in Settings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trendingItems.map((item) => {
              const isTV = item.media_type === "tv";
              const isAnime = isTV && item.original_language === "ja" && item.genre_ids?.includes(16);
              const mediaType = isAnime ? "anime" : isTV ? "tv" : "movie";

              return (
                <MediaCard
                  key={`${item.media_type}-${item.id}`}
                  id={item.id}
                  title={item.title || item.name || "Untitled"}
                  posterPath={item.poster_path}
                  backdropPath={item.backdrop_path}
                  mediaType={mediaType}
                  rating={item.vote_average}
                  releaseYear={(item.release_date || item.first_air_date || "").split("-")[0]}
                  genres={getGenreNames(item.genre_ids)}
                  layout="poster"
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
