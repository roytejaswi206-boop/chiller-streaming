"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MediaCard } from "./MediaCard";
import { formatDuration } from "@/lib/utils";

interface ContinueWatchingItem {
  id: string | number;
  tmdbId?: number;
  videoId?: string;
  mediaType: "movie" | "tv" | "anime";
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  progressSeconds?: number;
  durationSeconds?: number;
  lastWatchedAt?: string;
  completed?: boolean;
}

export function ContinueWatchingRail() {
  const { data: session } = useSession();
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);

      // Helper to check 95% completion (Section 15)
      const isUnfinished = (i: any) => {
        if (i.completed) return false;
        const prog = i.progressSeconds || 0;
        const dur = i.durationSeconds || 0;
        if (prog < 5) return false;
        if (dur > 0 && prog / dur >= 0.95) return false;
        return true;
      };

      // 1. If authenticated, fetch from DB
      if (session?.user) {
        try {
          const res = await fetch("/api/user/history");
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              const unfinished = data.items.filter(isUnfinished).map((i: any) => ({
                id: i.tmdbId || i.videoId || i.id,
                tmdbId: i.tmdbId,
                videoId: i.videoId,
                mediaType: i.mediaType || "movie",
                title: i.title || "Untitled",
                posterUrl: i.posterUrl,
                backdropUrl: i.backdropUrl,
                seasonNumber: i.seasonNumber,
                episodeNumber: i.episodeNumber,
                progressSeconds: i.progressSeconds || 0,
                durationSeconds: i.durationSeconds || 0,
                lastWatchedAt: i.lastWatchedAt,
              }));

              if (unfinished.length > 0) {
                setItems(unfinished);
                setLoading(false);
                return;
              }
            }
          }
        } catch {
          // Fallback to localStorage
        }
      }

      // 2. Guest fallback from localStorage
      try {
        const stored = localStorage.getItem("chiller_history");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const unfinished = parsed.filter(isUnfinished).map((i: any) => ({
              id: i.tmdbId || i.videoId || i.id,
              tmdbId: i.tmdbId,
              videoId: i.videoId,
              mediaType: i.mediaType || "movie",
              title: i.title || "Untitled",
              posterUrl: i.posterUrl,
              backdropUrl: i.backdropUrl,
              seasonNumber: i.seasonNumber,
              episodeNumber: i.episodeNumber,
              progressSeconds: i.progressSeconds || 0,
              durationSeconds: i.durationSeconds || 0,
              lastWatchedAt: i.lastWatchedAt,
            }));
            setItems(unfinished);
          }
        }
      } catch {
        // Non-blocking
      }

      setLoading(false);
    }

    loadHistory();
  }, [session]);

  if (loading || items.length === 0) {
    return null;
  }

  return (
    <section className="mb-10 select-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Continue Watching</span>
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30">
            Resume
          </span>
        </div>

        <Link
          href="/history"
          className="text-xs font-semibold text-[#FF3B6B] hover:text-[#FF3B6B]/80 transition flex items-center gap-1"
        >
          <span>Full History</span>
          <span>→</span>
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-1 -mx-1 px-1">
        {items.map((item, idx) => {
          const s = item.seasonNumber || 1;
          const e = item.episodeNumber || 1;
          const prog = item.progressSeconds || 0;

          // Build exact resume URL (Section 16)
          const watchUrl =
            item.mediaType === "movie"
              ? `/watch/movie/${item.tmdbId || item.id}?t=${prog}&resume=1`
              : item.mediaType === "anime"
              ? `/watch/anime/${item.tmdbId || item.id}?s=${s}&e=${e}&t=${prog}&resume=1`
              : `/watch/tv/${item.tmdbId || item.id}?s=${s}&e=${e}&t=${prog}&resume=1`;

          const resumeLabel =
            item.mediaType === "movie"
              ? `▶ ${formatDuration(prog)}`
              : `▶ S${s} E${e} · ${formatDuration(prog)}`;

          return (
            <div key={`${item.mediaType}-${item.id}-${idx}`} className="shrink-0 w-[240px] sm:w-[280px]">
              <MediaCard
                id={item.id}
                title={item.title}
                posterPath={item.posterUrl}
                backdropPath={item.backdropUrl}
                mediaType={item.mediaType}
                layout="backdrop"
                progressSeconds={item.progressSeconds}
                durationSeconds={item.durationSeconds}
                customHref={watchUrl}
                resumeLabel={resumeLabel}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
