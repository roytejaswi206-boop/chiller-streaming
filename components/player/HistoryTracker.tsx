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

    // 3. Record lightweight anonymous watch session (deduplicated)
    try {
      const mediaKey = tmdbId
        ? `tmdb:${mediaType}:${tmdbId}${season ? `:s${season}e${episode}` : ""}`
        : videoId
        ? `video:${videoId}`
        : title;

      const sid = localStorage.getItem("chiller_sid") || "cs_guest";
      const isTouch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
      const device =
        typeof navigator !== "undefined" && (/Mobi|Android|iPhone|iPod/i.test(navigator.userAgent) || isTouch)
          ? "mobile"
          : "desktop";

      fetch("/api/analytics/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          type: "WATCH",
          device,
          mediaKey,
          mediaType,
          route: typeof window !== "undefined" ? window.location.pathname : "",
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignore
    }
  }, [tmdbId, videoId, mediaType, title, posterUrl, season, episode, session]);

  return null;
}
