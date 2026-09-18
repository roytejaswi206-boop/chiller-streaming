"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaCard } from "@/components/video/MediaCard";
import { IconSearch } from "@/components/icons";
import { getGenreNames } from "@/lib/tmdb/genres";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<"all" | "movie" | "anime" | "tv">("all");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage("");
      setHasSearched(true);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Search error");
        }
        const data = await res.json();
        setResults(data.results || []);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to search stories.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Sync input when URL query changes
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Filter results
  const filteredResults = results.filter((item) => {
    if (item.media_type === "person") return false;
    const isTV = item.media_type === "tv";
    const isAnime = isTV && item.original_language === "ja" && item.genre_ids?.includes(16);

    if (activeFilter === "movie") return item.media_type === "movie";
    if (activeFilter === "anime") return isAnime;
    if (activeFilter === "tv") return isTV && !isAnime;
    return true;
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {/* Search Bar Header */}
        <div className="max-w-2xl mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Search Chiller
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mb-6">
            Explore movies, anime, TV series, and documentaries across the TMDB universe.
          </p>

          <div className="relative flex items-center">
            <IconSearch className="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search for movies, anime, series, directors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full h-12 pl-12 pr-4 rounded-2xl bg-[#0F172A] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-2 focus:ring-[#FF3B6B]/20 transition shadow-lg"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 text-xs font-bold text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { id: "all", label: "All Stories" },
              { id: "movie", label: "Movies" },
              { id: "anime", label: "Anime" },
              { id: "tv", label: "TV Series" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  activeFilter === f.id
                    ? "bg-[#FF3B6B] text-white shadow-md shadow-[#FF3B6B]/25"
                    : "bg-white/[0.05] hover:bg-white/10 text-zinc-300 border border-white/5"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-[#FF3B6B] border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-zinc-400 font-semibold">Searching catalog...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center max-w-md mx-auto my-8">
            <p className="text-xs font-bold text-rose-400 mb-1">Search Error</p>
            <p className="text-xs text-zinc-300">{errorMessage}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && hasSearched && filteredResults.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-[#0F172A] p-12 text-center max-w-md mx-auto my-12 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-white/5 text-zinc-400 flex items-center justify-center mx-auto mb-4 text-xl">
              🔍
            </div>
            <h3 className="text-base font-bold text-white mb-1">No stories found</h3>
            <p className="text-xs text-zinc-400">
              We couldn&apos;t find any results matching &quot;{query}&quot;. Try a different title or keyword.
            </p>
          </div>
        )}

        {/* Search Results Grid */}
        {!isLoading && filteredResults.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Results ({filteredResults.length})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredResults.map((item) => {
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
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C] items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#FF3B6B] border-t-transparent animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
