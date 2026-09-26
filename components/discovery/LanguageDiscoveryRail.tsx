"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { LANGUAGES, LanguageDefinition } from "@/lib/content/languages";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

interface LanguageDiscoveryRailProps {
  activeSlug?: string;
  className?: string;
}

export function LanguageDiscoveryRail({
  activeSlug,
  className = "",
}: LanguageDiscoveryRailProps) {
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
          <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-[#8A5CFF] to-[#FF3B6B]" />
          <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
            <span>Browse by Language</span>
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FF3B6B]/15 text-[#FF3B6B] border border-[#FF3B6B]/25">
            Original Audio
          </span>
        </div>

        {/* Scroll Arrows for Desktop */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll languages left"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition border border-white/5 cursor-pointer touch-manipulation active:scale-95"
          >
            <IconChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll languages right"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition border border-white/5 cursor-pointer touch-manipulation active:scale-95"
          >
            <IconChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Chips Track */}
      <div
        ref={scrollRef}
        className="flex gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar rail-track py-1 px-1 -mx-1 snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {LANGUAGES.map((lang: LanguageDefinition) => {
          const isActive = activeSlug === lang.slug || activeSlug === lang.code;

          return (
            <Link
              key={lang.slug}
              href={`/language/${lang.slug}`}
              className={`shrink-0 snap-start flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border transition-all duration-150 touch-manipulation tap-instant select-none min-h-[44px] ${
                isActive
                  ? "bg-[#FF3B6B] border-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25 font-bold"
                  : "bg-[#0F172A]/90 hover:bg-[#1E293B] border-white/10 text-zinc-300 hover:text-white hover:border-white/20 active:scale-95"
              }`}
            >
              {lang.flag && <span className="text-base leading-none">{lang.flag}</span>}
              <span className="text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap">
                {lang.name}
              </span>
              {lang.nativeName !== lang.name && (
                <span className={`text-[10px] whitespace-nowrap ${isActive ? "text-white/80" : "text-zinc-500"}`}>
                  ({lang.nativeName})
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
