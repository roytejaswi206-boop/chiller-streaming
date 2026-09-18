"use client";

import React, { useState } from "react";
import Image from "next/link";
import Link from "next/link";
import { IconClock, IconDotsVertical, IconHeart, IconPlay, IconPlus } from "@/components/icons";
import { formatDuration, formatTimeAgo, formatViews } from "@/lib/utils";

export interface VideoCardProps {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  createdAt: Date | string;
  resolution?: string;
  category?: { name: string; slug: string } | null;
  progressSeconds?: number;
  onWatchlistToggle?: () => void;
}

export function VideoCard({
  slug,
  title,
  thumbnailUrl,
  duration,
  views,
  createdAt,
  resolution = "1080p",
  category,
  progressSeconds = 0,
}: VideoCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [inFavorites, setInFavorites] = useState(false);

  const progressPercent = duration > 0 && progressSeconds > 0
    ? Math.min(100, Math.round((progressSeconds / duration) * 100))
    : 0;

  const toggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInWatchlist(!inWatchlist);
    setMenuOpen(false);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInFavorites(!inFavorites);
    setMenuOpen(false);
  };

  return (
    <div className="group relative flex flex-col rounded-xl transition duration-200">
      {/* Thumbnail Container */}
      <Link
        href={`/watch/${slug}`}
        className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#161620] border border-white/[0.08] shadow-md group-hover:border-white/20 transition cursor-pointer"
      >
        <img
          src={thumbnailUrl || "/images/placeholder.jpg"}
          alt={title}
          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Hover Overlay with Play Button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-[#FF3864] text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transform scale-90 group-hover:scale-100 transition">
            <IconPlay className="w-5 h-5 ml-0.5" />
          </div>
        </div>

        {/* Resolution Badge (e.g. HD or 4K) */}
        {resolution && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-extrabold uppercase tracking-wider text-zinc-300 border border-white/10">
            {resolution === "4K" ? "4K" : "HD"}
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[11px] font-semibold text-white">
          {formatDuration(duration)}
        </div>

        {/* Continue Watching Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
            <div
              className="h-full bg-[#FF3864]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </Link>

      {/* Metadata Row */}
      <div className="mt-2.5 flex items-start justify-between gap-2 px-0.5">
        <div className="flex-1 min-w-0">
          <Link
            href={`/watch/${slug}`}
            className="block text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-white truncate transition"
            title={title}
          >
            {title}
          </Link>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
            <span>{formatViews(views)}</span>
            <span>•</span>
            <span>{formatTimeAgo(createdAt)}</span>
          </div>
        </div>

        {/* 3-Dots Action Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="More Options"
          >
            <IconDotsVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              onMouseLeave={() => setMenuOpen(false)}
              className="absolute right-0 bottom-6 w-36 rounded-xl border border-white/10 bg-[#161622] p-1 shadow-2xl z-30 text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                onClick={toggleWatchlist}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition text-left"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>{inWatchlist ? "In My List" : "Add to List"}</span>
              </button>
              <button
                onClick={toggleFavorite}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition text-left"
              >
                <IconHeart className="w-3.5 h-3.5 text-rose-400" />
                <span>{inFavorites ? "Favorited" : "Favorite"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
