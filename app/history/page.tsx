"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { IconClock, IconPlay } from "@/components/icons";

interface HistoryItem {
  id: number | string;
  tmdbId?: number;
  videoId?: string;
  mediaType: "movie" | "tv" | "anime" | "video";
  title: string;
  posterUrl?: string;
  season?: number;
  episode?: number;
  lastWatchedAt?: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);

      // 1. If logged in, fetch from API
      if (session?.user) {
        try {
          const res = await fetch("/api/user/history");
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
                  season: i.seasonNumber,
                  episode: i.episodeNumber,
                  lastWatchedAt: i.lastWatchedAt,
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

      // 2. Load from localStorage
      try {
        const stored = localStorage.getItem("chiller_history");
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
      loadHistory();
    }
  }, [session, status]);

  const handleClearHistory = () => {
    localStorage.removeItem("chiller_history");
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
              Watch History
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Resume your recent movies, anime, and series where you left off.
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs font-bold text-zinc-400 hover:text-rose-400 transition cursor-pointer"
            >
              Clear History
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[#FF3B6B] border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-zinc-400">Loading watch history...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0F172A] p-12 text-center max-w-md mx-auto my-12 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-[#8A5CFF]/10 text-[#8A5CFF] border border-[#8A5CFF]/20 flex items-center justify-center mx-auto mb-4">
              <IconClock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">No Watch History</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              You haven&apos;t streamed any stories yet. Start watching now to track your journey.
            </p>
            <Link
              href="/"
              className="inline-block py-2.5 px-6 rounded-full bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25"
            >
              Browse Chiller
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => {
              const watchUrl =
                item.mediaType === "tv" || item.mediaType === "anime"
                  ? `/watch/tv-${item.tmdbId || item.id}?s=${item.season || 1}&e=${item.episode || 1}`
                  : `/watch/movie-${item.tmdbId || item.id}`;

              const imageSrc = item.posterUrl || "/placeholder-poster.png";

              return (
                <Link
                  key={`${item.mediaType}-${item.id}-${item.season || 1}-${item.episode || 1}`}
                  href={watchUrl}
                  className="group flex gap-3.5 p-3 rounded-2xl bg-[#0F172A] border border-white/[0.08] hover:border-[#FF3B6B]/40 transition duration-200"
                >
                  <div className="relative w-20 aspect-[2/3] rounded-xl overflow-hidden shrink-0 bg-black/40">
                    <Image
                      src={imageSrc}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-cover group-hover:scale-105 transition duration-300"
                      unoptimized={imageSrc.startsWith("http")}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition">
                      <div className="w-7 h-7 rounded-full bg-[#FF3B6B] text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition shadow">
                        <IconPlay className="w-3.5 h-3.5 ml-0.5 fill-white" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-white/[0.06] text-zinc-300 mb-1.5">
                        {item.mediaType.toUpperCase()}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#FF3B6B] transition line-clamp-1">
                        {item.title}
                      </h4>
                      {item.season && item.episode ? (
                        <p className="text-[11px] text-[#8A5CFF] font-semibold mt-0.5">
                          Season {item.season}, Episode {item.episode}
                        </p>
                      ) : null}
                    </div>

                    <p className="text-[10px] text-zinc-500">
                      {item.lastWatchedAt
                        ? `Watched ${new Date(item.lastWatchedAt).toLocaleDateString()}`
                        : "Recently streamed"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
