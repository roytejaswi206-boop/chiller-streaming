"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconPlay, IconPlus, IconCheck, IconStar } from "@/components/icons";

export interface HeroItem {
  id: number | string;
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

  useEffect(() => {
    if (!activeItem) return;
    try {
      const stored = localStorage.getItem("chiller_watchlist");
      if (stored) {
        const list = JSON.parse(stored);
        setIsInWatchlist(list.some((i: any) => String(i.id) === String(activeItem.id)));
      } else {
        setIsInWatchlist(false);
      }
    } catch {
      // Ignore
    }
  }, [activeItem]);

  if (!activeItem) {
    return null;
  }

  const watchUrl =
    activeItem.mediaType === "anime"
      ? `/watch/anime-${activeItem.id}`
      : activeItem.mediaType === "tv"
      ? `/watch/tv-${activeItem.id}`
      : `/watch/movie-${activeItem.id}`;

  const backdropUrl = activeItem.backdropPath
    ? activeItem.backdropPath.startsWith("http")
      ? activeItem.backdropPath
      : `https://image.tmdb.org/t/p/original${activeItem.backdropPath.startsWith("/") ? "" : "/"}${activeItem.backdropPath}`
    : activeItem.posterPath
    ? activeItem.posterPath.startsWith("http")
      ? activeItem.posterPath
      : `https://image.tmdb.org/t/p/original${activeItem.posterPath.startsWith("/") ? "" : "/"}${activeItem.posterPath}`
    : "/placeholder-backdrop.jpg";

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    const nextState = !isInWatchlist;
    setIsInWatchlist(nextState);
    try {
      const stored = localStorage.getItem("chiller_watchlist");
      let list = stored ? JSON.parse(stored) : [];
      if (!nextState) {
        list = list.filter((i: any) => String(i.id) !== String(activeItem.id));
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

      // Also attempt background sync to authenticated API if user is logged in
      if (nextState) {
        fetch("/api/user/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: typeof activeItem.id === "number" ? activeItem.id : undefined,
            mediaType: activeItem.mediaType,
            title: activeItem.title,
            posterUrl: activeItem.posterPath,
            backdropUrl: activeItem.backdropPath,
            rating: activeItem.rating,
            releaseYear: activeItem.releaseYear,
          }),
        }).catch(() => {});
      } else {
        fetch(`/api/user/watchlist?id=${activeItem.id}&mediaType=${activeItem.mediaType}`, {
          method: "DELETE",
        }).catch(() => {});
      }
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

      {/* Left / Right Slide Cycle Arrows (Image 1 & 2 design) */}
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
            }}
            aria-label="Previous Slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/40 hover:bg-[#FF3B6B] border border-white/10 hover:border-transparent text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl hidden sm:flex cursor-pointer group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              setCurrentIndex((prev) => (prev + 1) % items.length);
            }}
            aria-label="Next Slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/40 hover:bg-[#FF3B6B] border border-white/10 hover:border-transparent text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl hidden sm:flex cursor-pointer group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Content Container */}
      <div className="relative z-20 p-6 sm:p-10 lg:p-14 max-w-2xl">
        {/* Badges / Metadata */}
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
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

          <span className="px-2.5 py-0.5 rounded-full bg-black/40 border border-white/15 text-[10px] font-extrabold text-[#F8FAFC] tracking-wider uppercase">
            4K UHD
          </span>

          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-zinc-300">
            Dolby Vision
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
        <div className="flex flex-wrap items-center gap-3.5">
          <Link
            href={watchUrl}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FF3B6B] to-[#FF5A85] hover:brightness-110 text-white text-xs sm:text-sm font-black tracking-wide transition duration-200 shadow-xl shadow-[#FF3B6B]/30 hover:scale-[1.02] active:scale-95 cursor-pointer"
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

          <Link
            href={
              activeItem.mediaType === "anime"
                ? `/anime/${activeItem.id}`
                : activeItem.mediaType === "tv"
                ? `/series/${activeItem.id}`
                : `/movies/${activeItem.id}`
            }
            className="px-4 py-3 rounded-full text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            More Info
          </Link>
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

