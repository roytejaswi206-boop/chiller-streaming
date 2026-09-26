"use client";

import React, { useState } from "react";
import { CountryDefinition } from "@/lib/content/countries";
import type { MediaItem, DiscoveryQuery } from "@/lib/content/discovery";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { RegionalDiscoveryRail } from "./RegionalDiscoveryRail";
import { DiscoveryFilterDrawer, FilterState } from "./DiscoveryFilterDrawer";

interface CountryExplorerViewProps {
  country: CountryDefinition;
  initialItems: MediaItem[];
  initialHasNextPage: boolean;
}

export function CountryExplorerView({
  country,
  initialItems,
  initialHasNextPage,
}: CountryExplorerViewProps) {
  const [filterState, setFilterState] = useState<Partial<FilterState>>({
    mediaType: "all",
    sort: "popularity.desc",
  });

  const query: DiscoveryQuery = {
    country: country.code,
    language: filterState.language || country.primaryLang,
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
      {/* Country Header */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-[#0F172A] via-[#1E1B4B]/40 to-[#0F172A] border border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl sm:text-4xl drop-shadow">{country.flag}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30 text-[10px] font-black uppercase tracking-wider">
                Country Cinema • {country.code}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {country.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              {country.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* Regional Rail for quick hopping between nations */}
      <RegionalDiscoveryRail activeSlug={country.slug} />

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
        emptyTitle={`No titles found for ${country.name}.`}
        emptySubtitle="Try adjusting the filters above to discover more titles."
      />
    </div>
  );
}
