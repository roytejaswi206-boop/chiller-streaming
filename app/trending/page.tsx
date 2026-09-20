"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaCard } from "@/components/video/MediaCard";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { MediaItem, DiscoveryQuery } from "@/lib/content/discovery";

export default function TrendingPage() {
  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv" | "anime">("all");
  const [timeWindow, setTimeWindow] = useState<"day" | "week">("week");
  const [topItems, setTopItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load first page of trending for Top 10 / 20 visual ranking
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (mediaType !== "all") params.set("mediaType", mediaType);
    params.set("category", "trending");
    params.set("timeWindow", timeWindow);
    params.set("page", "1");

    fetch(`/api/discover?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isCancelled) {
          setTopItems(data.items || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [mediaType, timeWindow]);

  const top10 = topItems.slice(0, 10);
  const next10 = topItems.slice(10, 20);

  const query: DiscoveryQuery = {
    category: "trending",
    mediaType: mediaType !== "all" ? mediaType : undefined,
    timeWindow,
    page: 2, // Start infinite grid from page 2 (#21 onwards)
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#FF3B6B] uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-[#FF3B6B] animate-pulse" />
              Live Global Charts
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Trending on Chiller
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Real-time popularity charts based on active global audience engagement.
            </p>
          </div>

          {/* Controls: Media Type Tabs & Time Window */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Time window toggle */}
            <div className="flex items-center p-1 rounded-xl bg-[#0F172A] border border-white/10 text-xs">
              <button
                onClick={() => setTimeWindow("day")}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  timeWindow === "day"
                    ? "bg-[#FF3B6B] text-white shadow-md shadow-[#FF3B6B]/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeWindow("week")}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  timeWindow === "week"
                    ? "bg-[#FF3B6B] text-white shadow-md shadow-[#FF3B6B]/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                This Week
              </button>
            </div>

            {/* Media Type Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-[#0F172A] border border-white/10 text-xs">
              {(["all", "movie", "tv", "anime"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMediaType(t)}
                  className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
                    mediaType === t
                      ? "bg-white/15 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t === "all" ? "All" : t === "movie" ? "Movies" : t === "tv" ? "Series" : "Anime"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 1: Top 10 Visual Ranking Presentation */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-[#FF3B6B]" />
              <span>Top 10 Worldwide</span>
            </h2>
            <span className="text-xs font-semibold text-zinc-500">
              Ranked by {timeWindow === "day" ? "Daily" : "Weekly"} Velocity
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl bg-[#0F172A] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {top10.map((item, idx) => (
                <MediaCard
                  key={`${item.type}-${item.id}`}
                  id={item.id}
                  title={item.title}
                  posterPath={item.poster}
                  backdropPath={item.backdrop}
                  mediaType={item.type}
                  rating={item.rating}
                  releaseYear={item.year}
                  genres={item.genres}
                  rankingNumber={idx + 1}
                  badges={["#TRENDINGNOW"]}
                  layout="poster"
                />
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Top 11 to 20 Presentation */}
        {next10.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-[#8A5CFF]" />
                <span>Top 11 — 20 Contenders</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {next10.map((item, idx) => (
                <MediaCard
                  key={`${item.type}-${item.id}`}
                  id={item.id}
                  title={item.title}
                  posterPath={item.poster}
                  backdropPath={item.backdrop}
                  mediaType={item.type}
                  rating={item.rating}
                  releaseYear={item.year}
                  genres={item.genres}
                  rankingNumber={10 + idx + 1}
                  layout="poster"
                />
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Infinite Paginated Trending Beyond #20 */}
        <section>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
            <h2 className="text-base sm:text-lg font-bold text-zinc-200">
              More Trending Titles (#21+)
            </h2>
            <span className="text-xs text-zinc-500">Continuous Infinite Discovery</span>
          </div>

          <InfiniteMediaGrid query={query} initialPage={2} />
        </section>
      </main>
    </div>
  );
}
