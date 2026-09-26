"use client";

import React, { useState } from "react";
import Image from "next/image";
import { IconPlay } from "@/components/icons";

interface TrailerPreviewProps {
  trailerKey?: string | null;
  title: string;
  backdropUrl?: string | null;
}

export function TrailerPreview({
  trailerKey,
  title,
  backdropUrl,
}: TrailerPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!trailerKey) {
    return null;
  }

  const thumbUrl = backdropUrl || `https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg`;

  return (
    <div className="rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0F172A] shadow-2xl space-y-3 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-[#FF3B6B]" />
          <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
            Official Trailer
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/10 text-zinc-300 border border-white/10">
            HD Preview
          </span>
        </div>

        {isPlaying && (
          <button
            type="button"
            onClick={() => setIsPlaying(false)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition touch-manipulation tap-instant"
          >
            Close Trailer
          </button>
        )}
      </div>

      {/* Video Container */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/80 border border-white/10">
        {isPlaying ? (
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
            title={`${title} Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
            loading="lazy"
          />
        ) : (
          <div className="relative w-full h-full group cursor-pointer" onClick={() => setIsPlaying(true)}>
            {thumbUrl && (
              <Image
                src={thumbUrl}
                alt={`${title} Trailer thumbnail`}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-300"
                unoptimized={thumbUrl.startsWith("http")}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FF3B6B] text-white flex items-center justify-center shadow-xl shadow-[#FF3B6B]/40 group-hover:scale-110 active:scale-95 transition-transform duration-200 touch-manipulation"
                aria-label="Play trailer"
              >
                <IconPlay className="w-6 h-6 ml-0.5 fill-white" />
              </button>
              <span className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider drop-shadow-md">
                Play Trailer
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
