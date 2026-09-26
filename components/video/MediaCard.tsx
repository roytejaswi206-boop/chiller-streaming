"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { IconPlay, IconStar } from "@/components/icons";

export interface MediaCardProps {
  id: number | string;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  mediaType: "movie" | "tv" | "anime";
  rating?: number;
  releaseYear?: string;
  genres?: string[];
  layout?: "poster" | "backdrop";
  className?: string;
  rankingNumber?: number;
  badges?: string[];
  progressSeconds?: number;
  durationSeconds?: number;
  customHref?: string;
  resumeLabel?: string;
}

function MediaCardComponent({
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
  rankingNumber,
  badges = [],
  progressSeconds,
  durationSeconds,
  customHref,
  resumeLabel,
}: MediaCardProps) {
  // Detail or direct resume URL
  const detailUrl =
    customHref ||
    (mediaType === "anime"
      ? `/anime/${id}`
      : mediaType === "tv"
      ? `/series/${id}`
      : `/movies/${id}`);

  const imageSrc =
    layout === "backdrop"
      ? backdropPath
        ? backdropPath.startsWith("http")
          ? backdropPath
          : `https://image.tmdb.org/t/p/w780${backdropPath}`
        : posterPath
        ? posterPath.startsWith("http")
          ? posterPath
          : `https://image.tmdb.org/t/p/w342${posterPath}`
        : "/placeholder-backdrop.png"
      : posterPath
      ? posterPath.startsWith("http")
        ? posterPath
        : `https://image.tmdb.org/t/p/w342${posterPath}`
      : backdropPath
      ? backdropPath.startsWith("http")
        ? backdropPath
        : `https://image.tmdb.org/t/p/w780${backdropPath}`
      : "/placeholder-poster.png";

  const typeLabel = mediaType.toUpperCase();
  const progressPercent =
    progressSeconds && durationSeconds && durationSeconds > 0
      ? Math.min(100, Math.round((progressSeconds / durationSeconds) * 100))
      : 0;

  return (
    <Link
      href={detailUrl}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-[#0F172A] border border-white/[0.08] hover:border-[#FF3B6B]/50 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FF3B6B]/15 cursor-pointer select-none touch-manipulation tap-instant active:scale-[0.97] transform-gpu ${className}`}
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
          sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 220px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          unoptimized={imageSrc.startsWith("http")}
        />

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090C] via-transparent to-black/20 opacity-70 group-hover:opacity-40 transition-opacity" />

        {/* Ranking number presentation overlay */}
        {rankingNumber !== undefined && (
          <div className="absolute bottom-1 left-2 text-4xl sm:text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] select-none pointer-events-none z-20">
            <span className="text-[#FF3B6B]">#</span>
            {String(rankingNumber).padStart(2, "0")}
          </div>
        )}

        {/* Top Badges (High-Performance GPU-friendly styling) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-md ${
                mediaType === "anime"
                  ? "bg-[#8A5CFF] text-white border border-[#8A5CFF]/40"
                  : mediaType === "tv"
                  ? "bg-sky-600 text-white border border-sky-400/40"
                  : "bg-black/85 text-zinc-200 border border-white/15"
              }`}
            >
              {typeLabel}
            </span>

            {resumeLabel ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FF3B6B] text-white shadow-md">
                {resumeLabel}
              </span>
            ) : (
              badges.slice(0, 1).map((b) => (
                <span
                  key={b}
                  className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-[#FF3B6B] text-white border border-[#FF3B6B]/40 shadow-sm"
                >
                  {b}
                </span>
              ))
            )}
          </div>

          {rating !== undefined && rating > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/85 text-amber-400 border border-amber-500/30">
              <IconStar className="w-3 h-3 fill-amber-400" />
              <span>{rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Continue Watching Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 z-20">
            <div
              className="h-full bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Hover Action Overlay: Quick Watch / Details */}
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

export const MediaCard = React.memo(MediaCardComponent);
