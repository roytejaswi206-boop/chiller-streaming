"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

interface HistoryTrackerProps {
  tmdbId?: number;
  videoId?: string;
  mediaType: "movie" | "tv" | "anime" | "video";
  title: string;
  posterUrl?: string;
  season?: number;
  episode?: number;
}

export function HistoryTracker({
  tmdbId,
  videoId,
  mediaType,
  title,
  posterUrl,
  season,
  episode,
}: HistoryTrackerProps) {
  const { data: session } = useSession();

  useEffect(() => {
    // 1. Save to local storage
    try {
      const stored = localStorage.getItem("chiller_history");
      let list = stored ? JSON.parse(stored) : [];
      // Remove existing entry for same title to move to front
      list = list.filter((i: any) =>
        tmdbId ? i.tmdbId !== tmdbId : i.videoId !== videoId
      );
      list.unshift({
        id: tmdbId || videoId,
        tmdbId,
        videoId,
        mediaType,
        title,
        posterUrl,
        season,
        episode,
        lastWatchedAt: new Date().toISOString(),
      });
      localStorage.setItem("chiller_history", JSON.stringify(list.slice(0, 50)));
    } catch {
      // Ignore
    }

    // 2. Sync with database if logged in
    if (session?.user) {
      fetch("/api/user/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          videoId,
          mediaType,
          title,
          posterUrl,
          season,
          episode,
        }),
      }).catch(() => {
        // Ignore background error
      });
    }
  }, [tmdbId, videoId, mediaType, title, posterUrl, season, episode, session]);

  return null;
}
