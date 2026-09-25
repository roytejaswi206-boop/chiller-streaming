"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { MediaCard, MediaCardProps } from "./MediaCard";

interface MediaRailProps {
  title: string;
  items: Array<Omit<MediaCardProps, "layout">>;
  seeAllHref?: string;
  layout?: "poster" | "backdrop";
}

export function MediaRail({
  title,
  items,
  seeAllHref,
  layout = "poster",
}: MediaRailProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) {
    return null;
  }

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -480 : 480;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <section className="mb-10 select-none content-visibility-auto">
      {/* Rail Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>{title}</span>
        </h2>

        <div className="flex items-center gap-3">
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="text-xs font-semibold text-[#FF3B6B] hover:text-[#FF3B6B]/80 transition"
            >
              See All
            </Link>
          )}

          <div className="hidden sm:flex items-center gap-1 text-zinc-400">
            <button
              onClick={() => handleScroll("left")}
              aria-label="Scroll left"
              className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition cursor-pointer border border-white/5"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              aria-label="Scroll right"
              className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition cursor-pointer border border-white/5"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Rail Content (Horizontal Scroll) */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-1 -mx-1 px-1 snap-x snap-mandatory touch-pan-x"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item) => (
          <div
            key={`${item.mediaType}-${item.id}`}
            className={`shrink-0 snap-start ${
              layout === "backdrop"
                ? "w-[220px] min-[375px]:w-[260px] sm:w-[320px]"
                : "w-[130px] min-[375px]:w-[150px] sm:w-[180px] lg:w-[200px]"
            }`}
          >
            <MediaCard {...item} layout={layout} />
          </div>
        ))}
      </div>
    </section>
  );
}
