"use client";

import React, { useState } from "react";
import { LanguageDefinition } from "@/lib/content/languages";
import type { MediaItem, DiscoveryQuery } from "@/lib/content/discovery";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { LanguageDiscoveryRail } from "./LanguageDiscoveryRail";
import { DiscoveryFilterDrawer, FilterState } from "./DiscoveryFilterDrawer";

interface LanguageExplorerViewProps {
  language: LanguageDefinition;
  initialItems: MediaItem[];
  initialHasNextPage: boolean;
}

export function LanguageExplorerView({
  language,
  initialItems,
  initialHasNextPage,
}: LanguageExplorerViewProps) {
  const [filterState, setFilterState] = useState<Partial<FilterState>>({
    mediaType: "all",
    sort: "popularity.desc",
  });

  const query: DiscoveryQuery = {
    language: language.code,
    country: filterState.country,
    mediaType:
      filterState.mediaType === "documentary"
        ? "movie"
        : filterState.mediaType === "all"
        ? undefined
        : filterState.mediaType,
    genre: filterState.mediaType === "documentary" ? "documentary" : filterState.genre,
    sort: filterState.sort || "popularity.desc",
    year: filterState.year ? parseInt(filterState.year, 10) : undefined,
  };

  return (
    <div className="space-y-6">
      {/* Language Header */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-[#0F172A] via-[#1E1B4B]/40 to-[#0F172A] border border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {language.flag && <span className="text-3xl sm:text-4xl drop-shadow">{language.flag}</span>}
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30 text-[10px] font-black uppercase tracking-wider">
                Original Language Audio • {language.code.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-3">
              <span>{language.name}</span>
              {language.nativeName !== language.name && (
                <span className="text-lg sm:text-2xl font-bold text-[#FF3B6B]">
                  ({language.nativeName})
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              Explore movies, series, and anime originally spoken in {language.name} ({language.nativeName}).
            </p>
          </div>
        </div>
      </div>

      {/* Language Rail for quick jumping between languages */}
      <LanguageDiscoveryRail activeSlug={language.slug} />

      {/* Interactive Filter Drawer */}
      <DiscoveryFilterDrawer
        initialFilters={filterState}
        onFilterChange={(newFilters) => setFilterState(newFilters)}
      />

      {/* Grid of Results */}
      <InfiniteMediaGrid
        initialItems={initialItems}
        initialHasNextPage={initialHasNextPage}
        query={query}
        emptyTitle={`No titles found in ${language.name}.`}
        emptySubtitle="Try adjusting the filters above to discover more titles."
      />
    </div>
  );
}
