"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const loadingPagesRef = useRef<Set<number>>(new Set());
  const loadedPagesRef = useRef<Set<number>>(new Set());
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const searchAbortCtrlRef = useRef<AbortController | null>(null);

  // Debounced search effect for page 1 with AbortController
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      if (searchAbortCtrlRef.current) searchAbortCtrlRef.current.abort();
      setResults([]);
      setHasSearched(false);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalResults(0);
      loadingPagesRef.current.clear();
      loadedPagesRef.current.clear();
      return;
    }

    const timer = setTimeout(async () => {
      if (searchAbortCtrlRef.current) {
        searchAbortCtrlRef.current.abort();
      }
      const controller = new AbortController();
      searchAbortCtrlRef.current = controller;

      setIsLoading(true);
      setErrorMessage("");
      setHasSearched(true);
      loadingPagesRef.current.clear();
      loadedPagesRef.current.clear();

      try {
        loadingPagesRef.current.add(1);
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&page=1`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Search error");
        }
        const data = await res.json();
        const initialItems = data.results || [];
        setResults(initialItems);
        setCurrentPage(1);
        setTotalPages(data.total_pages || 1);
        setTotalResults(data.total_results || 0);
        loadedPagesRef.current.add(1);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setErrorMessage(err.message || "Failed to search stories.");
          setResults([]);
        }
      } finally {
        loadingPagesRef.current.delete(1);
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (searchAbortCtrlRef.current) searchAbortCtrlRef.current.abort();
    };
  }, [query]);

  // Sync input when URL query changes
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Infinite scroll: fetch next page
  const fetchNextPage = useCallback(async () => {
    const trimmed = query.trim();
    const nextPage = currentPage + 1;

    if (
      !trimmed ||
      nextPage > totalPages ||
      isLoading ||
      isLoadingMore ||
      loadingPagesRef.current.has(nextPage) ||
      loadedPagesRef.current.has(nextPage)
    ) {
      return;
    }

    loadingPagesRef.current.add(nextPage);
    setIsLoadingMore(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&page=${nextPage}`);
      if (!res.ok) throw new Error("Search page fetch failed");

      const data = await res.json();
      const newItems: any[] = data.results || [];
      loadedPagesRef.current.add(nextPage);

      setResults((prev) => {
        const existingIds = new Set(prev.map((i) => `${i.media_type}-${i.id}`));
        const uniqueNew = newItems.filter((i) => !existingIds.has(`${i.media_type}-${i.id}`));
        return [...prev, ...uniqueNew];
      });

      setCurrentPage(nextPage);
    } catch {
      // Graceful error retention
    } finally {
      loadingPagesRef.current.delete(nextPage);
      setIsLoadingMore(false);
    }
  }, [currentPage, totalPages, isLoading, isLoadingMore, query]);

  // Sentinel intersection observer for infinite scroll
  useEffect(() => {
    const hasNext = currentPage < totalPages;
    if (!hasNext || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" }
    );

    const target = observerTargetRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) observer.unobserve(target);
      observer.disconnect();
    };
  }, [currentPage, totalPages, isLoading, isLoadingMore, fetchNextPage]);

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
                className="absolute right-4 text-xs font-bold text-zinc-500 hover:text-white transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        {hasSearched && !isLoading && results.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              {(["all", "movie", "tv", "anime"] as const).map((filter) => {
                const label =
                  filter === "all"
                    ? "All Titles"
                    : filter === "movie"
                    ? "Movies"
                    : filter === "tv"
                    ? "Series"
                    : "Anime";
                const isActive = activeFilter === filter;

                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? "bg-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25"
                        : "bg-[#0F172A] border border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-zinc-400">
              Showing {filteredResults.length} of {totalResults} available titles
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-[#FF3B6B] border-t-transparent animate-spin mb-4" />
            <p className="text-xs font-semibold text-zinc-400">Searching global catalogue...</p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center max-w-md mx-auto my-8">
            <p className="text-sm font-semibold text-red-400 mb-1">{errorMessage}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && hasSearched && filteredResults.length === 0 && !errorMessage && (
          <div className="rounded-3xl border border-white/10 bg-[#0F172A] p-12 text-center max-w-md mx-auto my-12 shadow-xl">
            <p className="text-base font-bold text-white mb-2">No matching titles found</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We couldn't find anything matching &quot;{query}&quot;. Try searching for another movie, series, or anime.
            </p>
          </div>
        )}

        {/* Search Results Grid with Infinite Scroll */}
        {!isLoading && filteredResults.length > 0 && (
          <>
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

            {/* Sentinel */}
            <div ref={observerTargetRef} className="h-12 flex items-center justify-center mt-6">
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                  <div className="w-5 h-5 rounded-full border-2 border-[#FF3B6B] border-t-transparent animate-spin" />
                  <span>Loading more search results...</span>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090C]" />}>
      <SearchContent />
    </Suspense>
  );
}
