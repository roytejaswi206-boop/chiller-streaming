"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { IconCheck, IconPlus } from "@/components/icons";

interface WatchlistButtonProps {
  tmdbId?: number;
  videoId?: string;
  mediaType?: "movie" | "tv" | "anime" | "video";
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number;
  releaseYear?: string;
}

export function WatchlistButton({
  tmdbId,
  videoId,
  mediaType = "movie",
  title,
  posterUrl,
  backdropUrl,
  rating,
  releaseYear,
}: WatchlistButtonProps) {
  const { data: session } = useSession();
  const [isInList, setIsInList] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const itemKey = tmdbId ? `tmdb-${tmdbId}` : `video-${videoId}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("chiller_watchlist");
      if (stored) {
        const list = JSON.parse(stored);
        const exists = list.some((i: any) =>
          tmdbId ? i.tmdbId === tmdbId : i.videoId === videoId
        );
        setIsInList(exists);
      }
    } catch {
      // Ignore
    }
  }, [tmdbId, videoId]);

  const handleToggle = async () => {
    setIsSaving(true);
    const nextState = !isInList;
    setIsInList(nextState);

    // 1. Sync localStorage
    try {
      const stored = localStorage.getItem("chiller_watchlist");
      let list = stored ? JSON.parse(stored) : [];
      if (nextState) {
        list.push({
          id: tmdbId || videoId,
          tmdbId,
          videoId,
          mediaType,
          title,
          posterUrl,
          backdropUrl,
          rating,
          releaseYear,
          addedAt: new Date().toISOString(),
        });
      } else {
        list = list.filter((i: any) =>
          tmdbId ? i.tmdbId !== tmdbId : i.videoId !== videoId
        );
      }
      localStorage.setItem("chiller_watchlist", JSON.stringify(list));
    } catch {
      // Ignore
    }

    // 2. Sync to Database if logged in
    if (session?.user) {
      try {
        await fetch("/api/user/watchlist", {
          method: nextState ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId,
            videoId,
            mediaType,
            title,
            posterUrl,
            backdropUrl,
            rating,
            releaseYear,
          }),
        });
      } catch {
        // Fallback gracefully to localStorage
      }
    }

    setIsSaving(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isSaving}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-wide transition duration-150 cursor-pointer border backdrop-blur-md ${
        isInList
          ? "bg-[#FF3B6B]/20 border-[#FF3B6B]/40 text-[#FF3B6B]"
          : "bg-white/10 hover:bg-white/15 border-white/15 text-zinc-200 hover:text-white"
      }`}
    >
      {isInList ? (
        <>
          <IconCheck className="w-4 h-4 text-[#FF3B6B]" />
          <span>In My List</span>
        </>
      ) : (
        <>
          <IconPlus className="w-4 h-4" />
          <span>+ My List</span>
        </>
      )}
    </button>
  );
}
