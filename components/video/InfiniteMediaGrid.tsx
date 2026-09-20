"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MediaCard } from "./MediaCard";
import { MediaItem, DiscoveryQuery } from "@/lib/content/discovery";

export interface InfiniteMediaGridProps {
  query: DiscoveryQuery;
  initialItems?: MediaItem[];
  initialPage?: number;
  initialHasNextPage?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  className?: string;
}

export function InfiniteMediaGrid({
  query,
  initialItems = [],
  initialPage = 1,
  initialHasNextPage = true,
  emptyTitle = "No titles found for this category.",
  emptySubtitle = "Explore related categories or check your filter criteria.",
  className = "",
}: InfiniteMediaGridProps) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(initialItems.length === 0);

  const loadingPagesRef = useRef<Set<number>>(new Set());
  const loadedPagesRef = useRef<Set<number>>(new Set(initialItems.length > 0 ? [initialPage] : []));
  const observerTargetRef = useRef<HTMLDivElement>(null);

  const fetchNextPage = useCallback(async () => {
    const nextPage = currentPage + 1;
    if (!hasNextPage || isLoadingMore || loadingPagesRef.current.has(nextPage) || loadedPagesRef.current.has(nextPage)) {
      return;
    }

    loadingPagesRef.current.add(nextPage);
    setIsLoadingMore(true);

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
      params.set("page", String(nextPage));

      const res = await fetch(`/api/discover?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load next page");

      const data = await res.json();
      const newItems: MediaItem[] = data.items || [];
      const next = Boolean(data.hasNextPage);

      loadedPagesRef.current.add(nextPage);

      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => `${i.type}-${i.id}`));
        const uniqueNew = newItems.filter((i) => !existingIds.has(`${i.type}-${i.id}`));
        return [...prev, ...uniqueNew];
      });

      setCurrentPage(nextPage);
      setHasNextPage(next);
    } catch {
      // Graceful error retention
    } finally {
      loadingPagesRef.current.delete(nextPage);
      setIsLoadingMore(false);
    }
  }, [currentPage, hasNextPage, isLoadingMore, query]);

  // Initial fetch if initialItems empty
  useEffect(() => {
    if (initialItems.length === 0) {
      setInitialLoading(true);
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
      params.set("page", "1");

      fetch(`/api/discover?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          setItems(data.items || []);
          setCurrentPage(1);
          setHasNextPage(Boolean(data.hasNextPage));
          loadedPagesRef.current.add(1);
        })
        .catch(() => {})
        .finally(() => setInitialLoading(false));
    }
  }, [query, initialItems.length]);

  // IntersectionObserver for vertical infinite scroll sentinel
  useEffect(() => {
    if (!hasNextPage || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" } // Triggers 600px before reaching absolute bottom (approx 70-80% scroll depth)
    );

    const target = observerTargetRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) observer.unobserve(target);
      observer.disconnect();
    };
  }, [hasNextPage, isLoadingMore, fetchNextPage]);

  if (initialLoading) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ${className}`}>
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] rounded-2xl bg-[#0F172A] border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#0F172A] p-12 text-center max-w-lg mx-auto my-12 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-[#FF3B6B]/10 text-[#FF3B6B] border border-[#FF3B6B]/20 flex items-center justify-center mx-auto mb-4 font-black">
          !
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{emptyTitle}</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">{emptySubtitle}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((item, idx) => (
          <MediaCard
            key={`${item.type}-${item.id}-${idx}`}
            id={item.id}
            title={item.title}
            posterPath={item.poster}
            backdropPath={item.backdrop}
            mediaType={item.type}
            rating={item.rating}
            releaseYear={item.year}
            genres={item.genres}
            badges={item.badges}
            layout="poster"
          />
        ))}
      </div>

      {/* Infinite Scroll Trigger Sentinel */}
      <div ref={observerTargetRef} className="h-10 flex items-center justify-center">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <div className="w-5 h-5 rounded-full border-2 border-[#FF3B6B] border-t-transparent animate-spin" />
            <span>Discovering more titles...</span>
          </div>
        )}

        {!hasNextPage && items.length > 0 && (
          <div className="text-xs font-semibold text-zinc-500 py-4 text-center">
            You've reached the end of the catalogue.
          </div>
        )}
      </div>
    </div>
  );
}
