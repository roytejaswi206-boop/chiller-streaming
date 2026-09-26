"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { COUNTRIES, CountryDefinition } from "@/lib/content/countries";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

interface RegionalDiscoveryRailProps {
  activeSlug?: string;
  className?: string;
}

export function RegionalDiscoveryRail({
  activeSlug,
  className = "",
}: RegionalDiscoveryRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -400 : 400;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section className={`mb-8 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-[#FF3B6B] to-[#8A5CFF]" />
          <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
            <span>Browse by Region & Country</span>
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/10 text-zinc-300 border border-white/10">
            Global Hub
          </span>
        </div>

        {/* Scroll Arrows for Desktop */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll countries left"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition border border-white/5 cursor-pointer touch-manipulation active:scale-95"
          >
            <IconChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll countries right"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition border border-white/5 cursor-pointer touch-manipulation active:scale-95"
          >
            <IconChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Track */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar rail-track py-1 px-1 -mx-1 snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {COUNTRIES.map((country: CountryDefinition) => {
          const isActive = activeSlug === country.slug;

          return (
            <Link
              key={country.slug}
              href={`/country/${country.slug}`}
              className={`shrink-0 snap-start flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all duration-150 touch-manipulation tap-instant select-none ${
                isActive
                  ? "bg-gradient-to-r from-[#FF3B6B]/25 to-[#8A5CFF]/25 border-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/20"
                  : "bg-[#0F172A]/90 hover:bg-[#1E293B] border-white/10 text-zinc-200 hover:text-white hover:border-white/20 active:scale-95"
              }`}
            >
              <span className="text-xl sm:text-2xl drop-shadow-sm leading-none">{country.flag}</span>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap">
                  {country.name}
                </div>
                <div className="text-[10px] text-zinc-400 font-medium whitespace-nowrap max-w-[130px] truncate">
                  {country.code}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
