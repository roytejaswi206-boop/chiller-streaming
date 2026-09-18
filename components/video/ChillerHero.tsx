"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconPlay, IconPlus, IconCheck, IconStar } from "@/components/icons";

export interface HeroItem {
  id: number;
  title: string;
  overview: string;
  backdropPath: string | null;
  posterPath: string | null;
  mediaType: "movie" | "tv" | "anime";
  rating?: number;
  releaseYear?: string;
  genres?: string[];
}

interface ChillerHeroProps {
  items: HeroItem[];
}

export function ChillerHero({ items }: ChillerHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  const activeItem = items && items.length > 0 ? items[currentIndex] : null;

  useEffect(() => {
    if (!items || items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [items]);

  if (!activeItem) {
    return null;
  }

  const watchUrl = `/watch/${activeItem.mediaType === "tv" || activeItem.mediaType === "anime" ? "tv" : "movie"}-${activeItem.id}`;
  const backdropUrl = activeItem.backdropPath
    ? `https://image.tmdb.org/t/p/original${activeItem.backdropPath}`
    : activeItem.posterPath
    ? `https://image.tmdb.org/t/p/original${activeItem.posterPath}`
    : "/placeholder-backdrop.jpg";

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsInWatchlist(!isInWatchlist);
    try {
      const stored = localStorage.getItem("chiller_watchlist");
      let list = stored ? JSON.parse(stored) : [];
      if (isInWatchlist) {
        list = list.filter((i: any) => i.id !== activeItem.id);
      } else {
        list.push({
          id: activeItem.id,
          title: activeItem.title,
          posterPath: activeItem.posterPath,
          backdropPath: activeItem.backdropPath,
          mediaType: activeItem.mediaType,
          rating: activeItem.rating,
          releaseYear: activeItem.releaseYear,
        });
      }
      localStorage.setItem("chiller_watchlist", JSON.stringify(list));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden mb-10 min-h-[380px] sm:min-h-[460px] lg:min-h-[520px] flex items-end border border-white/[0.08] shadow-2xl bg-[#09090C]">
      {/* Cinematic Backdrop Image */}
      <Image
        src={backdropUrl}
        alt={activeItem.title}
        fill
        priority
        className="object-cover object-center transition-all duration-1000 ease-out brightness-90"
        unoptimized={backdropUrl.startsWith("http")}
      />

      {/* Atmospheric Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090C] via-[#09090C]/60 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#09090C] via-[#09090C]/50 to-transparent z-10" />

      {/* Content Container */}
      <div className="relative z-20 p-6 sm:p-10 lg:p-14 max-w-2xl">
        {/* Badges / Metadata */}
        <div className="flex flex-wrap items-center gap-2.5 mb-3 text-xs">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest backdrop-blur-md shadow-md ${
              activeItem.mediaType === "anime"
                ? "bg-[#8A5CFF]/90 text-white border border-[#8A5CFF]/40"
                : activeItem.mediaType === "tv"
                ? "bg-sky-500/90 text-white border border-sky-400/40"
                : "bg-[#FF3B6B]/90 text-white border border-[#FF3B6B]/40"
            }`}
          >
            {activeItem.mediaType.toUpperCase()}
          </span>

          {activeItem.genres && activeItem.genres.slice(0, 3).map((g) => (
            <span
              key={g}
              className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold text-zinc-200 border border-white/10"
            >
              {g}
            </span>
          ))}

          {activeItem.releaseYear && (
            <span className="text-zinc-400 font-semibold">{activeItem.releaseYear}</span>
          )}

          {activeItem.rating !== undefined && activeItem.rating > 0 && (
            <span className="flex items-center gap-1 text-amber-400 font-bold ml-1">
              <IconStar className="w-3.5 h-3.5 fill-amber-400" />
              <span>{activeItem.rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md mb-3 line-clamp-2">
          {activeItem.title}
        </h1>

        {/* Short description */}
        <p className="text-xs sm:text-sm text-zinc-300 line-clamp-3 leading-relaxed max-w-xl mb-6 drop-shadow">
          {activeItem.overview}
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-3.5">
          <Link
            href={watchUrl}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs sm:text-sm font-bold tracking-wide transition duration-200 shadow-xl shadow-[#FF3B6B]/30 hover:scale-[1.02] cursor-pointer"
          >
            <IconPlay className="w-4 h-4 fill-white" />
            <span>Watch Now</span>
          </Link>

          <button
            onClick={handleToggleWatchlist}
            className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-semibold tracking-wide border transition duration-200 cursor-pointer backdrop-blur-md ${
              isInWatchlist
                ? "bg-white/20 border-white/40 text-white"
                : "bg-white/10 hover:bg-white/15 border-white/15 text-zinc-200 hover:text-white"
            }`}
          >
            {isInWatchlist ? (
              <>
                <IconCheck className="w-4 h-4 text-emerald-400" />
                <span>In My List</span>
              </>
            ) : (
              <>
                <IconPlus className="w-4 h-4" />
                <span>+ My List</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Slide dots indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 sm:right-10 z-20 flex items-center gap-2">
          {items.slice(0, 5).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === idx ? "w-6 bg-[#FF3B6B]" : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
