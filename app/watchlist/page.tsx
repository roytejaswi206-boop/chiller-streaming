"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaCard } from "@/components/video/MediaCard";
import { IconPlus } from "@/components/icons";

interface WatchlistItem {
  id: number | string;
  tmdbId?: number;
  videoId?: string;
  mediaType: "movie" | "tv" | "anime";
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number;
  releaseYear?: string;
  addedAt?: string;
}

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWatchlist() {
      setIsLoading(true);

      // 1. If logged in, fetch from API
      if (session?.user) {
        try {
          const res = await fetch("/api/user/watchlist");
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              setItems(
                data.items.map((i: any) => ({
                  id: i.tmdbId || i.videoId || i.id,
                  tmdbId: i.tmdbId,
                  videoId: i.videoId,
                  mediaType: i.mediaType || "movie",
                  title: i.title,
                  posterUrl: i.posterUrl,
                  backdropUrl: i.backdropUrl,
                  rating: i.rating,
                  releaseYear: i.releaseYear,
                  addedAt: i.addedAt,
                }))
              );
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Fallback to localStorage
        }
      }

      // 2. Load from localStorage (Guest or fallback)
      try {
        const stored = localStorage.getItem("chiller_watchlist");
        if (stored) {
          setItems(JSON.parse(stored));
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      }
      setIsLoading(false);
    }

    if (status !== "loading") {
      loadWatchlist();
    }
  }, [session, status]);

  const handleClearList = () => {
    localStorage.removeItem("chiller_watchlist");
    setItems([]);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My List
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Your saved collection of movies, anime, and series to watch anytime.
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleClearList}
              className="text-xs font-bold text-zinc-400 hover:text-rose-400 transition cursor-pointer"
            >
              Clear List
            </button>
          )}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[#FF3B6B] border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-zinc-400">Loading your list...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0F172A] p-12 text-center max-w-md mx-auto my-12 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-[#FF3B6B]/10 text-[#FF3B6B] border border-[#FF3B6B]/20 flex items-center justify-center mx-auto mb-4">
              <IconPlus className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Your List is Empty</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Explore movies, anime, or series and click &quot;+ My List&quot; to build your personal streaming queue.
            </p>
            <Link
              href="/movies"
              className="inline-block py-2.5 px-6 rounded-full bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25"
            >
              Explore Movies & Series
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <MediaCard
                key={`${item.mediaType}-${item.id}`}
                id={typeof item.id === "number" ? item.id : parseInt(String(item.tmdbId || item.id), 10) || 1}
                title={item.title}
                posterPath={item.posterUrl || null}
                backdropPath={item.backdropUrl || null}
                mediaType={item.mediaType}
                rating={item.rating}
                releaseYear={item.releaseYear}
                layout="poster"
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
