"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { IconChevronRight, IconPlay } from "@/components/icons";
import { TmdbEpisode, TmdbSeasonDetail } from "@/lib/tmdb/client";

interface EpisodePickerProps {
  slug: string;
  currentSeason: number;
  currentEpisode: number;
  seasons: { season_number: number; name: string; episode_count: number }[];
  currentSeasonDetails?: TmdbSeasonDetail;
}

export function EpisodePicker({
  slug,
  currentSeason,
  currentEpisode,
  seasons,
  currentSeasonDetails,
}: EpisodePickerProps) {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);

  const episodes: TmdbEpisode[] = currentSeasonDetails?.episodes || [];
  const currentEpIndex = episodes.findIndex((ep) => ep.episode_number === currentEpisode);
  const nextEpisode = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1
    ? episodes[currentEpIndex + 1]
    : null;

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = parseInt(e.target.value, 10);
    setSelectedSeason(s);
    router.push(`/watch/${slug}?s=${s}&e=1`);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 mb-8">
      {/* Header: Title, Season Selector & Next Episode Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Episodes
          </h3>

          {/* Season Dropdown */}
          {seasons.length > 0 && (
            <select
              value={selectedSeason}
              onChange={handleSeasonChange}
              className="px-3 py-1.5 rounded-xl bg-[#09090C] border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-[#FF3B6B] transition cursor-pointer"
            >
              {seasons.map((s) => (
                <option key={s.season_number} value={s.season_number} className="bg-[#09090C]">
                  {s.name || `Season ${s.season_number}`} ({s.episode_count} eps)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Next Episode Action */}
        {nextEpisode && (
          <Link
            href={`/watch/${slug}?s=${selectedSeason}&e=${nextEpisode.episode_number}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF3B6B]/15 hover:bg-[#FF3B6B]/25 text-[#FF3B6B] border border-[#FF3B6B]/30 text-xs font-bold transition"
          >
            <span>Next: Ep {nextEpisode.episode_number}</span>
            <IconChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Episode Cards Grid / List */}
      {episodes.length === 0 ? (
        <p className="text-xs text-zinc-400 py-4 text-center">
          Loading episodes for Season {selectedSeason}...
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {episodes.map((ep) => {
            const isPlaying = ep.episode_number === currentEpisode && selectedSeason === currentSeason;
            const stillUrl = ep.still_path
              ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
              : "/placeholder-backdrop.jpg";

            return (
              <Link
                key={ep.id}
                href={`/watch/${slug}?s=${selectedSeason}&e=${ep.episode_number}`}
                className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer ${
                  isPlaying
                    ? "border-[#FF3B6B] bg-[#FF3B6B]/10 shadow-lg shadow-[#FF3B6B]/10"
                    : "border-white/[0.06] bg-[#09090C]/60 hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                  <Image
                    src={stillUrl}
                    alt={ep.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 300px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized={stillUrl.startsWith("http")}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                  {/* Play badge / active indicator */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-extrabold bg-black/80 backdrop-blur-md text-white border border-white/10">
                    EP {ep.episode_number}
                  </div>

                  {isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FF3B6B] text-white shadow-lg">
                        <IconPlay className="w-3 h-3 fill-white" /> Now Playing
                      </span>
                    </div>
                  )}
                </div>

                {/* Episode Meta */}
                <div className="p-3 flex flex-col justify-between flex-1">
                  <div>
                    <h4
                      className={`text-xs font-bold line-clamp-1 mb-1 ${
                        isPlaying ? "text-[#FF3B6B]" : "text-white group-hover:text-[#FF3B6B]"
                      } transition-colors`}
                    >
                      {ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {ep.overview || "No overview available for this episode."}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
