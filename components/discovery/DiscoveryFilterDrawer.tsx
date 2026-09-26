"use client";

import React, { useState, useEffect } from "react";
import { LANGUAGES } from "@/lib/content/languages";
import { COUNTRIES } from "@/lib/content/countries";
import { GENRE_SLUG_MAP } from "@/lib/tmdb/genres";

export interface FilterState {
  mediaType: "all" | "movie" | "tv" | "anime" | "documentary";
  language?: string;
  country?: string;
  genre?: string;
  year?: string;
  rating?: string;
  sort: string;
}

export interface DiscoveryFilterDrawerProps {
  initialFilters?: Partial<FilterState>;
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

const DEFAULT_FILTERS: FilterState = {
  mediaType: "all",
  sort: "popularity.desc",
};

const SORT_OPTIONS = [
  { label: "Trending", value: "trending" },
  { label: "Popular", value: "popularity.desc" },
  { label: "Newest", value: "release_date.desc" },
  { label: "Top Rated", value: "vote_average.desc" },
];

const CONTENT_TYPES = [
  { label: "All Content", value: "all" },
  { label: "Movies", value: "movie" },
  { label: "TV Series", value: "tv" },
  { label: "Anime", value: "anime" },
  { label: "Documentaries", value: "documentary" },
];

const POPULAR_GENRES = Object.entries(GENRE_SLUG_MAP).slice(0, 16).map(([slug, g]) => ({
  slug,
  name: g.name,
}));

const YEARS = ["2026", "2025", "2024", "2023", "2022", "2020s", "2010s", "2000s"];
const RATINGS = ["9+ ★", "8+ ★", "7+ ★", "6+ ★"];

export function DiscoveryFilterDrawer({
  initialFilters,
  onFilterChange,
  className = "",
}: DiscoveryFilterDrawerProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const [isOpen, setIsOpen] = useState(false);

  // Sync initial filters
  useEffect(() => {
    if (initialFilters) {
      setFilters((prev) => ({ ...prev, ...initialFilters }));
    }
  }, [initialFilters]);

  const activeFilterCount = [
    filters.mediaType !== "all",
    Boolean(filters.language),
    Boolean(filters.country),
    Boolean(filters.genre),
    Boolean(filters.year),
    Boolean(filters.rating),
    filters.sort !== "popularity.desc",
  ].filter(Boolean).length;

  const handleApply = () => {
    onFilterChange(filters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetState: FilterState = { ...DEFAULT_FILTERS };
    setFilters(resetState);
    onFilterChange(resetState);
    setIsOpen(false);
  };

  const updateField = (field: keyof FilterState, value: any) => {
    setFilters((prev) => {
      const updated = {
        ...prev,
        [field]: prev[field] === value ? undefined : value,
      };
      if (field === "mediaType" && !updated.mediaType) {
        updated.mediaType = "all";
      }
      return updated;
    });
  };

  return (
    <div className={`w-full ${className}`}>
      {/* ── Desktop & Tablet Compact Filter Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#0F172A]/80 border border-white/10 backdrop-blur-md">
        {/* Quick Type Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar rail-track py-0.5">
          {CONTENT_TYPES.map((type) => {
            const isActive = filters.mediaType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  const next = { ...filters, mediaType: type.value as any };
                  setFilters(next);
                  onFilterChange(next);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-manipulation tap-instant min-h-[36px] ${
                  isActive
                    ? "bg-[#FF3B6B] text-white shadow-md shadow-[#FF3B6B]/25"
                    : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                }`}
              >
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Filter Trigger Button (Mobile Bottom Sheet & Desktop Modal) */}
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-zinc-400 hover:text-white transition px-2 py-1"
            >
              Clear All ({activeFilterCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/15 text-white text-xs font-bold transition touch-manipulation tap-instant min-h-[40px] shadow-sm cursor-pointer"
          >
            <span className="text-sm">⚙️</span>
            <span>Filters & Sort</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#FF3B6B] text-white text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Sheet Drawer / Dialog ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet Container */}
          <div
            className="relative z-10 w-full md:max-w-2xl max-h-[85dvh] flex flex-col rounded-t-3xl md:rounded-3xl bg-[#0F172A] border border-white/15 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
          >
            {/* Sheet Handle */}
            <div className="pt-3 pb-2 flex justify-center md:hidden">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Sheet Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎛️</span>
                <h3 className="text-base font-black text-white">Filter & Refine</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 text-zinc-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Sheet Body (Vertical Scroll) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 vertical-scroll">
              {/* Sort By */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
                  Sort Order
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField("sort", opt.value)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition touch-manipulation tap-instant ${
                        filters.sort === opt.value
                          ? "bg-[#FF3B6B] border-[#FF3B6B] text-white font-bold shadow-md shadow-[#FF3B6B]/20"
                          : "bg-black/30 border-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
                  Genre
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-1">
                  {POPULAR_GENRES.map((g) => (
                    <button
                      key={g.slug}
                      type="button"
                      onClick={() => updateField("genre", g.slug)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition touch-manipulation tap-instant ${
                        filters.genre === g.slug
                          ? "bg-[#8A5CFF] border-[#8A5CFF] text-white font-bold"
                          : "bg-black/30 border-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
                  Language (Original Audio)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-1">
                  {LANGUAGES.slice(0, 16).map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => updateField("language", lang.code)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold border transition touch-manipulation tap-instant ${
                        filters.language === lang.code
                          ? "bg-[#FF3B6B] border-[#FF3B6B] text-white font-bold"
                          : "bg-black/30 border-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
                  Origin Country / Region
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-1">
                  {COUNTRIES.slice(0, 16).map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => updateField("country", c.code)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold border transition touch-manipulation tap-instant ${
                        filters.country === c.code
                          ? "bg-sky-600 border-sky-500 text-white font-bold"
                          : "bg-black/30 border-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
                  Release Period
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => updateField("year", y)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition touch-manipulation tap-instant ${
                        filters.year === y
                          ? "bg-emerald-600 border-emerald-500 text-white font-bold"
                          : "bg-black/30 border-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet Footer (Actions) */}
            <div className="p-4 border-t border-white/10 bg-[#09090C] flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-1/3 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 transition touch-manipulation tap-instant"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-xs font-extrabold uppercase tracking-wider transition touch-manipulation tap-instant shadow-lg shadow-[#FF3B6B]/25"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
