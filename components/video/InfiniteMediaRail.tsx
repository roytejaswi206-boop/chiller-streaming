"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { MediaCard, MediaCardProps } from "./MediaCard";
import { MediaItem, DiscoveryQuery } from "@/lib/content/discovery";

export interface InfiniteMediaRailProps {
  title: string;
  query: DiscoveryQuery;
  initialItems?: MediaItem[];
  seeAllHref?: string;
  layout?: "poster" | "backdrop";
  ranking?: boolean;
  className?: string;
  badge?: string;
}

export function InfiniteMediaRail({
  title,
  query,
  initialItems = [],
  seeAllHref,
  layout = "poster",
  ranking = false,
  className = "",
  badge,
}: InfiniteMediaRailProps) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(initialItems.length === 0);
  const [hasInteracted, setHasInteracted] = useState(initialItems.length > 0);

  // In-memory prefetch buffer for instant right-arrow clicking
  const prefetchedPageRef = useRef<{ page: number; items: MediaItem[]; hasNextPage: boolean } | null>(null);
  const loadingPagesRef = useRef<Set<number>>(new Set());
  const loadedPagesRef = useRef<Set<number>>(new Set(initialItems.length > 0 ? [1] : []));

  const railRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper to fetch a page safely
  const fetchPage = useCallback(
    async (pageToFetch: number): Promise<{ items: MediaItem[]; hasNextPage: boolean } | null> => {
      if (loadingPagesRef.current.has(pageToFetch) || loadedPagesRef.current.has(pageToFetch)) {
        return null;
      }

      loadingPagesRef.current.add(pageToFetch);

      try {
        const params = new URLSearchParams();
        if (query.mediaType) params.set("mediaType", query.mediaType);
        if (query.category) params.set("category", query.category);
        if (query.genre) params.set("genre", String(query.genre));
        if (query.language) params.set("language", query.language);
        if (query.country) params.set("country", query.country);
        if (query.sort) params.set("sort", query.sort);
        if (query.timeWindow) params.set("timeWindow", query.timeWindow);
        if (query.format) params.set("format", query.format);
        if (query.query) params.set("query", query.query);
        params.set("page", String(pageToFetch));

        const res = await fetch(`/api/discover?${params.toString()}`);
        if (!res.ok) throw new Error("Fetch failed");

        const data = await res.json();
        const newItems: MediaItem[] = data.items || [];
        const next = Boolean(data.hasNextPage);

        loadedPagesRef.current.add(pageToFetch);
        return { items: newItems, hasNextPage: next };
      } catch {
        return null;
      } finally {
        loadingPagesRef.current.delete(pageToFetch);
      }
    },
    [query]
  );

  // Below-the-fold intersection observer for lazy loading
  useEffect(() => {
    if (initialItems.length > 0 || hasInteracted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasInteracted(true);
          setIsInitialLoading(true);
          fetchPage(1).then((res) => {
            if (res) {
              setItems(res.items);
              setHasNextPage(res.hasNextPage);
              setCurrentPage(1);
            }
            setIsInitialLoading(false);
          });
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );

    if (railRef.current) {
      observer.observe(railRef.current);
    }

    return () => observer.disconnect();
  }, [fetchPage, initialItems.length, hasInteracted]);

  // Prefetch page + 1 when user scrolls near 70-80% horizontal scroll
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !hasNextPage || isLoadingMore) return;

    const scrollLeft = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;

    const scrollRatio = scrollLeft / maxScroll;

    // Trigger prefetch around 70%
    if (scrollRatio >= 0.7) {
      const nextPage = currentPage + 1;
      if (!loadedPagesRef.current.has(nextPage) && !loadingPagesRef.current.has(nextPage)) {
        fetchPage(nextPage).then((res) => {
          if (res) {
            prefetchedPageRef.current = {
              page: nextPage,
              items: res.items,
              hasNextPage: res.hasNextPage,
            };
          }
        });
      }
    }

    // If near the end (85%+), append prefetched items or trigger immediate load
    if (scrollRatio >= 0.85) {
      if (prefetchedPageRef.current && prefetchedPageRef.current.page === currentPage + 1) {
        const buffered = prefetchedPageRef.current;
        prefetchedPageRef.current = null;
        setItems((prev) => {
          const existingIds = new Set(prev.map((i) => `${i.type}-${i.id}`));
          const uniqueNew = buffered.items.filter((i) => !existingIds.has(`${i.type}-${i.id}`));
          return [...prev, ...uniqueNew];
        });
        setCurrentPage(buffered.page);
        setHasNextPage(buffered.hasNextPage);
      } else if (!loadingPagesRef.current.has(currentPage + 1)) {
        setIsLoadingMore(true);
        fetchPage(currentPage + 1).then((res) => {
          if (res) {
            setItems((prev) => {
              const existingIds = new Set(prev.map((i) => `${i.type}-${i.id}`));
              const uniqueNew = res.items.filter((i) => !existingIds.has(`${i.type}-${i.id}`));
              return [...prev, ...uniqueNew];
            });
            setCurrentPage(currentPage + 1);
            setHasNextPage(res.hasNextPage);
          }
          setIsLoadingMore(false);
        });
      }
    }
  }, [currentPage, hasNextPage, isLoadingMore, fetchPage]);

  // Arrow navigation
  const scrollDirection = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -550 : 550;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });

    // Check if we need to immediately apply buffered items when clicking right
    if (direction === "right" && prefetchedPageRef.current && prefetchedPageRef.current.page === currentPage + 1) {
      const buffered = prefetchedPageRef.current;
      prefetchedPageRef.current = null;
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => `${i.type}-${i.id}`));
        const uniqueNew = buffered.items.filter((i) => !existingIds.has(`${i.type}-${i.id}`));
        return [...prev, ...uniqueNew];
      });
      setCurrentPage(buffered.page);
      setHasNextPage(buffered.hasNextPage);
    }
  };

  if (!isInitialLoading && items.length === 0) {
    return null;
  }

  return (
    <section ref={railRef} className={`mb-10 select-none ${className}`}>
      {/* Rail Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>{title}</span>
          </h2>
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="text-xs font-semibold text-[#FF3B6B] hover:text-[#FF3B6B]/80 transition flex items-center gap-1"
            >
              <span>See All</span>
              <span>→</span>
            </Link>
          )}

          <div className="hidden sm:flex items-center gap-1 text-zinc-400">
            <button
              onClick={() => scrollDirection("left")}
              aria-label="Scroll left"
              className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition cursor-pointer border border-white/5"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollDirection("right")}
              aria-label="Scroll right"
              className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition cursor-pointer border border-white/5"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Rail Horizontal Track */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-1 -mx-1 px-1"
      >
        {isInitialLoading ? (
          // Initial Skeletons
          Array.from({ length: 7 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className={`shrink-0 rounded-2xl bg-[#0F172A] border border-white/5 animate-pulse ${
                layout === "backdrop"
                  ? "w-[260px] sm:w-[320px] aspect-video"
                  : "w-[150px] sm:w-[180px] lg:w-[200px] aspect-[2/3]"
              }`}
            />
          ))
        ) : (
          <>
            {items.map((item, idx) => (
              <div
                key={`${item.type}-${item.id}-${idx}`}
                className={`shrink-0 ${
                  layout === "backdrop"
                    ? "w-[260px] sm:w-[320px]"
                    : "w-[150px] sm:w-[180px] lg:w-[200px]"
                }`}
              >
                <MediaCard
                  id={item.id}
                  title={item.title}
                  posterPath={item.poster}
                  backdropPath={item.backdrop}
                  mediaType={item.type}
                  rating={item.rating}
                  releaseYear={item.year}
                  genres={item.genres}
                  layout={layout}
                  badges={item.badges}
                  rankingNumber={ranking ? idx + 1 : undefined}
                />
              </div>
            ))}

            {isLoadingMore && (
              // Loading indicator for next page
              <div
                className={`shrink-0 flex items-center justify-center rounded-2xl bg-[#0F172A]/50 border border-white/5 ${
                  layout === "backdrop"
                    ? "w-[160px] sm:w-[200px] aspect-video"
                    : "w-[120px] sm:w-[150px] aspect-[2/3]"
                }`}
              >
                <div className="w-6 h-6 rounded-full border-2 border-[#FF3B6B] border-t-transparent animate-spin" />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
