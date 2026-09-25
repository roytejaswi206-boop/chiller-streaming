"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { IconPlay, IconCheck } from "@/components/icons";

export interface EpisodeItem {
  id: number | string;
  episode_number: number;
  name: string;
  overview?: string;
  still_path?: string | null;
  runtime?: number;
  vote_average?: number;
  isFiller?: boolean;
}

interface EpisodeListProps {
  episodes: EpisodeItem[];
  currentEpisode: number;
  onSelectEpisode: (episodeNumber: number) => void;
  tmdbId?: number | string;
  seasonNumber?: number;
  className?: string;
}

const CHUNK_SIZE = 50;

export function EpisodeList({
  episodes = [],
  currentEpisode,
  onSelectEpisode,
  tmdbId,
  seasonNumber = 1,
  className = "",
}: EpisodeListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());

  // Keep active chunk aligned with currently playing episode if list is large
  useEffect(() => {
    if (episodes.length > CHUNK_SIZE && currentEpisode) {
      const chunkIdx = Math.floor((currentEpisode - 1) / CHUNK_SIZE);
      if (chunkIdx >= 0) {
        setActiveChunkIndex(chunkIdx);
      }
    }
  }, [currentEpisode, episodes.length]);

  // Search filtering
  const filteredEpisodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return episodes;

    return episodes.filter((ep) => {
      const matchesNum = String(ep.episode_number) === query;
      const matchesName = ep.name?.toLowerCase().includes(query);
      const matchesOverview = ep.overview?.toLowerCase().includes(query);
      return matchesNum || matchesName || matchesOverview;
    });
  }, [episodes, searchQuery]);

  // Chunking for large shows (100+ episodes)
  const isChunked = !searchQuery && filteredEpisodes.length > CHUNK_SIZE;
  const chunkCount = Math.ceil(filteredEpisodes.length / CHUNK_SIZE);

  const displayedEpisodes = useMemo(() => {
    if (!isChunked) return filteredEpisodes;
    const start = activeChunkIndex * CHUNK_SIZE;
    return filteredEpisodes.slice(start, start + CHUNK_SIZE);
  }, [filteredEpisodes, isChunked, activeChunkIndex]);

  // Load watched state for displayed episodes asynchronously to avoid freezing main thread
  useEffect(() => {
    if (!tmdbId || displayedEpisodes.length === 0) return;
    try {
      const watched = new Set<number>();
      for (const ep of displayedEpisodes) {
        const key = `chiller_progress_tv_${tmdbId}_s${seasonNumber}_e${ep.episode_number}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.currentTime && parsed.duration && parsed.currentTime / parsed.duration > 0.85) {
            watched.add(ep.episode_number);
          }
        }
      }
      setWatchedEpisodes((prev) => {
        const merged = new Set(prev);
        watched.forEach((n) => merged.add(n));
        return merged;
      });
    } catch {
      // Ignore
    }
  }, [tmdbId, seasonNumber, displayedEpisodes]);

  return (
    <div className={`w-full rounded-2xl bg-[#0F172A] border border-white/[0.08] p-4 sm:p-5 ${className}`}>
      {/* Header with Search and Chunk selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
            Episodes
          </h3>
          <span className="text-xs text-zinc-400 font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            {episodes.length} total
          </span>
        </div>

        {/* Instant Search input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ep # or title..."
            className="w-full px-3.5 py-1.5 rounded-xl bg-[#09090C] border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Pagination Chunk Selector for large episode shows (1-50, 51-100, etc.) */}
      {isChunked && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-3 border-b border-white/[0.06]">
          {Array.from({ length: chunkCount }, (_, i) => {
            const startEp = i * CHUNK_SIZE + 1;
            const endEp = Math.min((i + 1) * CHUNK_SIZE, episodes.length);
            const isCurrent = i === activeChunkIndex;

            return (
              <button
                key={i}
                onClick={() => setActiveChunkIndex(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer touch-manipulation active:scale-95 ${
                  isCurrent
                    ? "bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/40"
                    : "bg-[#09090C] text-zinc-400 hover:text-white border border-white/5"
                }`}
              >
                {startEp} - {endEp}
              </button>
            );
          })}
        </div>
      )}

      {/* Episode Grid */}
      {displayedEpisodes.length === 0 ? (
        <p className="text-xs text-zinc-500 py-8 text-center">
          No episodes found matching "{searchQuery}"
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayedEpisodes.map((ep) => {
            const isPlaying = ep.episode_number === currentEpisode;
            const isWatched = watchedEpisodes.has(ep.episode_number);
            const thumbnail = ep.still_path
              ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
              : "/placeholder-backdrop.jpg";

            return (
              <button
                type="button"
                key={ep.id}
                onClick={() => onSelectEpisode(ep.episode_number)}
                aria-pressed={isPlaying}
                aria-label={`Episode ${ep.episode_number}: ${ep.name || ""}`}
                className={`group relative flex flex-col rounded-xl overflow-hidden border text-left transition-all duration-150 cursor-pointer touch-manipulation active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B6B] ${
                  isPlaying
                    ? "border-[#FF3B6B] bg-[#FF3B6B]/10 shadow-lg shadow-[#FF3B6B]/15 ring-1 ring-[#FF3B6B]"
                    : "border-white/[0.06] bg-[#09090C]/70 hover:border-white/20 hover:bg-[#1E293B]/50"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                  <Image
                    src={thumbnail}
                    alt={ep.name || `Episode ${ep.episode_number}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 300px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    unoptimized={thumbnail.startsWith("http")}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-black/85 text-white border border-white/10 shadow-sm">
                      EP {ep.episode_number}
                    </span>
                    {ep.isFiller && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/90 text-white">
                        Filler
                      </span>
                    )}
                  </div>

                  {/* Watched Badge */}
                  {isWatched && !isPlaying && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600/90 text-white flex items-center gap-1 border border-emerald-400/30 shadow-sm">
                      <IconCheck className="w-3 h-3" />
                      <span>Watched</span>
                    </div>
                  )}

                  {/* Play Overlay / Active Indicator */}
                  {isPlaying ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FF3B6B] text-white shadow-lg">
                        <IconPlay className="w-3 h-3 fill-white" /> Now Playing
                      </span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-9 h-9 rounded-full bg-[#FF3B6B] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <IconPlay className="w-4 h-4 ml-0.5 fill-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-3 flex flex-col justify-between flex-1">
                  <div>
                    <h4
                      className={`text-xs font-bold line-clamp-1 mb-1 transition-colors ${
                        isPlaying ? "text-[#FF3B6B]" : "text-white group-hover:text-[#FF3B6B]"
                      }`}
                    >
                      {ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {ep.overview || "No overview available for this episode."}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
