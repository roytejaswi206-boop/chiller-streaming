"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { IconPlay, IconPlus, IconStar } from "@/components/icons";

export interface MediaCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  mediaType: "movie" | "tv" | "anime";
  rating?: number;
  releaseYear?: string;
  genres?: string[];
  layout?: "poster" | "backdrop";
  className?: string;
}

export function MediaCard({
  id,
  title,
  posterPath,
  backdropPath,
  mediaType,
  rating,
  releaseYear,
  genres = [],
  layout = "poster",
  className = "",
}: MediaCardProps) {
  const watchUrl = `/watch/${mediaType === "tv" || mediaType === "anime" ? "tv" : "movie"}-${id}`;

  const imageSrc =
    layout === "backdrop" && backdropPath
      ? `https://image.tmdb.org/t/p/w780${backdropPath}`
      : posterPath
      ? `https://image.tmdb.org/t/p/w500${posterPath}`
      : "/placeholder-poster.png";

  const typeLabel = mediaType.toUpperCase();

  return (
    <Link
      href={watchUrl}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-[#0F172A] border border-white/[0.08] hover:border-[#FF3B6B]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FF3B6B]/15 cursor-pointer select-none ${className}`}
    >
      {/* Image container */}
      <div
        className={`relative w-full overflow-hidden bg-[#1E293B] ${
          layout === "backdrop" ? "aspect-video" : "aspect-[2/3]"
        }`}
      >
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          unoptimized={imageSrc.startsWith("http")}
        />

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090C] via-transparent to-black/20 opacity-70 group-hover:opacity-40 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-md ${
              mediaType === "anime"
                ? "bg-[#8A5CFF]/80 text-white border border-[#8A5CFF]/40"
                : mediaType === "tv"
                ? "bg-sky-500/80 text-white border border-sky-400/40"
                : "bg-black/60 text-zinc-200 border border-white/15"
            }`}
          >
            {typeLabel}
          </span>

          {rating !== undefined && rating > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-amber-400 border border-amber-500/30">
              <IconStar className="w-3 h-3 fill-amber-400" />
              <span>{rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Hover Action Overlay: Quick Watch */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-[#FF3B6B] text-white flex items-center justify-center shadow-lg shadow-[#FF3B6B]/40 transform scale-90 group-hover:scale-100 transition-transform">
            <IconPlay className="w-5 h-5 ml-0.5 fill-white" />
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-1">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#FF3B6B] transition-colors line-clamp-1">
            {title}
          </h3>

          <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
            {releaseYear && <span>{releaseYear}</span>}
            {genres.length > 0 && (
              <>
                <span>•</span>
                <span className="truncate">{genres.slice(0, 2).join(", ")}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
