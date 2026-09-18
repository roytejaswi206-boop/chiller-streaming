"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ExternalPlayer } from "@/components/player/ExternalPlayer";
import { PlaybackSource } from "@/lib/playback/types";

interface WatchPlayerProps {
  sources: PlaybackSource[];
  title: string;
  posterUrl?: string;
  mediaType?: "movie" | "tv" | "anime";
  tmdbId?: number;
  anilistId?: number;
  season?: number;
  episode?: number;
  slug: string;
}

/**
 * WatchPlayer — thin Client Component wrapping ExternalPlayer for the watch page.
 *
 * Handles onNextEpisode by pushing the next episode URL via router.push.
 * Keeps the watch page (page.tsx) as a pure Server Component.
 */
export function WatchPlayer({
  sources,
  title,
  posterUrl,
  mediaType,
  tmdbId,
  anilistId,
  season,
  episode,
  slug,
}: WatchPlayerProps) {
  const router = useRouter();

  const handleNextEpisode = useCallback(
    (nextSeason: number, nextEpisode: number) => {
      router.push(`/watch/${slug}?s=${nextSeason}&e=${nextEpisode}`);
    },
    [router, slug]
  );

  return (
    <ExternalPlayer
      sources={sources}
      title={title}
      posterUrl={posterUrl}
      mediaType={mediaType}
      tmdbId={tmdbId}
      anilistId={anilistId}
      season={season}
      episode={episode}
      onNextEpisode={handleNextEpisode}
    />
  );
}
