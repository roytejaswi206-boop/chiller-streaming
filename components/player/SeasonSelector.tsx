"use client";

import React from "react";

export interface SeasonInfo {
  season_number: number;
  name?: string;
  episode_count?: number;
  poster_path?: string | null;
}

interface SeasonSelectorProps {
  seasons: SeasonInfo[];
  selectedSeason: number;
  onSelectSeason: (seasonNumber: number) => void;
  className?: string;
}

export function SeasonSelector({
  seasons,
  selectedSeason,
  onSelectSeason,
  className = "",
}: SeasonSelectorProps) {
  if (!seasons || seasons.length === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
        {seasons.map((season) => {
          const isSelected = season.season_number === selectedSeason;
          const label = season.name || (season.season_number === 0 ? "Specials" : `Season ${season.season_number}`);

          return (
            <button
              key={season.season_number}
              onClick={() => onSelectSeason(season.season_number)}
              className={`group shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer touch-manipulation active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B6B] ${
                isSelected
                  ? "bg-[#FF3B6B] border-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25"
                  : "bg-[#0F172A] border-white/10 text-zinc-300 hover:border-white/25 hover:bg-[#1E293B] hover:text-white"
              }`}
            >
              <span>{label}</span>
              {season.episode_count !== undefined && season.episode_count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    isSelected ? "bg-black/20 text-white" : "bg-white/10 text-zinc-400 group-hover:text-zinc-200"
                  }`}
                >
                  {season.episode_count} eps
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
