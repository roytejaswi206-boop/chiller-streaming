"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalPlayer } from "@/components/player/ExternalPlayer";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { SeasonSelector, SeasonInfo } from "@/components/player/SeasonSelector";
import { EpisodeList, EpisodeItem } from "@/components/player/EpisodeList";
import { WatchlistButton } from "@/components/player/WatchlistButton";
import { HistoryTracker } from "@/components/player/HistoryTracker";
import { MediaRail } from "@/components/video/MediaRail";
import { IconStar, IconChevronLeft, IconChevronRight } from "@/components/icons";
import { PlaybackCandidate, PlaybackSource } from "@/lib/playback/types";
import { TmdbSeasonDetail } from "@/lib/tmdb/client";

interface WatchExperienceProps {
  initialSources: PlaybackCandidate[];
  title: string;
  originalTitle?: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  releaseYear: string;
  genres: string[];
  rating: number;
  runtime?: number;
  mediaType: "movie" | "tv" | "anime" | "video";
  sourceType: "OWNED" | "EXTERNAL" | "UNAVAILABLE";
  tmdbId?: number;
  anilistId?: number;
  initialSeason?: number;
  initialEpisode?: number;
  totalSeasons?: number;
  seasons?: SeasonInfo[];
  currentSeasonDetails?: TmdbSeasonDetail;
  cast?: { id: number; name: string; character: string; profile_path: string | null }[];
  recommendations?: any[];
  streamUrl?: string;
  backupStreamUrls?: string[];
  subtitles?: { language: string; label: string; url: string }[];
  qualities?: { quality: string; bitrate?: number }[];
  slug: string;
}

export function WatchExperience({
  initialSources = [],
  title,
  originalTitle,
  overview,
  posterUrl,
  backdropUrl,
  releaseYear,
  genres = [],
  rating = 0,
  runtime,
  mediaType,
  sourceType,
  tmdbId,
  anilistId,
  initialSeason = 1,
  initialEpisode = 1,
  totalSeasons = 1,
  seasons = [],
  currentSeasonDetails,
  cast = [],
  recommendations = [],
  streamUrl,
  backupStreamUrls,
  subtitles,
  qualities,
  slug,
}: WatchExperienceProps) {
  const [sources, setSources] = useState<PlaybackCandidate[]>(initialSources);
  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [language, setLanguage] = useState<"sub" | "dub">("sub");
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoNext, setAutoNext] = useState(true);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [seasonEpisodes, setSeasonEpisodes] = useState<EpisodeItem[]>(
    currentSeasonDetails?.episodes || []
  );
  const [isResolvingNewEpisode, setIsResolvingNewEpisode] = useState(false);
  const [, startTransition] = useTransition();

  // Helper to construct shareable clean URL
  const buildWatchUrl = useCallback(
    (s: number, e: number, lang = language) => {
      if (mediaType === "movie") return `/watch/movie/${tmdbId || slug}`;
      const base = mediaType === "anime" ? `/watch/anime/${anilistId || tmdbId || slug}` : `/watch/tv/${tmdbId || slug}`;
      return `${base}?s=${s}&e=${e}${lang === "dub" ? "&type=dub" : ""}`;
    },
    [mediaType, tmdbId, anilistId, slug, language]
  );

  // Client-side episode resolution without full-page reload
  const handleSelectEpisode = useCallback(
    async (episodeNum: number, seasonNum = currentSeason) => {
      if (episodeNum === currentEpisode && seasonNum === currentSeason) return;

      setIsResolvingNewEpisode(true);
      setCurrentEpisode(episodeNum);
      setCurrentSeason(seasonNum);

      // Smooth URL state update without browser refresh
      const nextUrl = buildWatchUrl(seasonNum, episodeNum);
      window.history.pushState(null, "", nextUrl);

      try {
        const id = tmdbId || anilistId;
        const res = await fetch(
          `/api/playback/resolve?type=${mediaType}&id=${id}&s=${seasonNum}&e=${episodeNum}&lang=${language}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.candidates && data.candidates.length > 0) {
            setSources(data.candidates);
            setActiveSourceIndex(0);
          }
        }
      } catch (err) {
        console.error("Episode resolution error:", err);
      } finally {
        setIsResolvingNewEpisode(false);
      }
    },
    [currentEpisode, currentSeason, buildWatchUrl, tmdbId, anilistId, mediaType, language]
  );

  // Client-side season change: updates episodes list without full page reload
  const handleSelectSeason = useCallback(
    async (seasonNum: number) => {
      if (seasonNum === currentSeason) return;

      setCurrentSeason(seasonNum);
      // Fetch new season episodes via TMDB client or proxy
      if (tmdbId) {
        try {
          const res = await fetch(`/api/content/tv/${tmdbId}`);
          if (res.ok) {
            // Alternatively resolve first episode of new season
            handleSelectEpisode(1, seasonNum);
          }
        } catch {
          handleSelectEpisode(1, seasonNum);
        }
      } else {
        handleSelectEpisode(1, seasonNum);
      }
    },
    [currentSeason, tmdbId, handleSelectEpisode]
  );

  // Preload next episode metadata in background
  useEffect(() => {
    if (mediaType === "tv" || mediaType === "anime") {
      const nextEp = currentEpisode + 1;
      const id = tmdbId || anilistId;
      if (id) {
        // Inexpensive background availability query
        fetch(`/api/playback/resolve?type=${mediaType}&id=${id}&s=${currentSeason}&e=${nextEp}&lang=${language}`).catch(() => {});
      }
    }
  }, [currentEpisode, currentSeason, mediaType, tmdbId, anilistId, language]);

  // Current episode details
  const currentEpInfo = seasonEpisodes.find((ep) => ep.episode_number === currentEpisode);
  const currentEpIndex = seasonEpisodes.findIndex((ep) => ep.episode_number === currentEpisode);
  const hasPrev = currentEpIndex > 0;
  const hasNext = currentEpIndex >= 0 && currentEpIndex < seasonEpisodes.length - 1;

  // Language server counts
  const subCandidates = sources.filter((s) => s.language !== "dub");
  const dubCandidates = sources.filter((s) => s.language === "dub");

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Silent Watch History Tracker */}
      <HistoryTracker
        tmdbId={tmdbId}
        mediaType={mediaType as any}
        title={title}
        posterUrl={posterUrl}
        season={currentSeason}
        episode={currentEpisode}
      />

      {/* ── 1. Video Player Container ── */}
      <div className="w-full">
        {sourceType === "EXTERNAL" && sources.length > 0 ? (
          <ExternalPlayer
            sources={sources}
            title={`${title} ${mediaType !== "movie" ? `S${currentSeason} E${currentEpisode}` : ""}`}
            posterUrl={backdropUrl || posterUrl}
            mediaType={mediaType as any}
            tmdbId={tmdbId}
            anilistId={anilistId}
            season={currentSeason}
            episode={currentEpisode}
            autoPlay={autoPlay}
            autoNext={autoNext}
            onToggleAutoPlay={() => setAutoPlay((v) => !v)}
            onToggleAutoNext={() => setAutoNext((v) => !v)}
            onNextEpisode={(nextS, nextE) => handleSelectEpisode(nextE, nextS)}
            onPrevEpisode={() => hasPrev && handleSelectEpisode(seasonEpisodes[currentEpIndex - 1].episode_number)}
            hasNextEpisode={hasNext}
            hasPrevEpisode={hasPrev}
            onSelectSourceIndex={(idx) => setActiveSourceIndex(idx)}
          />
        ) : sourceType === "OWNED" && streamUrl ? (
          <VideoPlayer
            streamUrl={streamUrl}
            backupStreamUrls={backupStreamUrls}
            title={title}
            posterUrl={backdropUrl || posterUrl}
            subtitles={subtitles}
            qualities={qualities}
            autoPlay={autoPlay}
          />
        ) : (
          <div className="aspect-video w-full rounded-2xl bg-[#0F172A] border border-white/10 flex flex-col items-center justify-center p-8 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mb-4">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Playback Currently Unavailable</h2>
            <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
              We couldn't reach a stream for this title right now. Please verify API settings in the admin panel or try again.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/" className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-bold transition">
                Return Home
              </Link>
              <button
                onClick={() => handleSelectEpisode(currentEpisode, currentSeason)}
                className="px-5 py-2 rounded-full bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25 cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Episode Info & Quick Action Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                mediaType === "anime"
                  ? "bg-[#8A5CFF]/20 text-[#8A5CFF] border border-[#8A5CFF]/30"
                  : mediaType === "tv"
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  : "bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30"
              }`}
            >
              {mediaType.toUpperCase()}
            </span>

            {mediaType !== "movie" && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-extrabold text-white border border-white/10">
                Season {currentSeason} • Episode {currentEpisode}
              </span>
            )}

            {releaseYear && <span className="text-xs font-semibold text-zinc-400">{releaseYear}</span>}

            {rating > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold">
                <IconStar className="w-3.5 h-3.5 fill-amber-400" />
                <span>{rating.toFixed(1)}</span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {title}
          </h1>

          {currentEpInfo?.name && (
            <p className="text-sm font-semibold text-zinc-300 mt-0.5">
              Ep {currentEpisode}: {currentEpInfo.name}
            </p>
          )}

          {originalTitle && originalTitle !== title && (
            <p className="text-xs text-zinc-500 mt-0.5">Original: {originalTitle}</p>
          )}
        </div>

        {/* Watchlist Action */}
        <div className="flex items-center gap-3 shrink-0">
          <WatchlistButton
            tmdbId={tmdbId}
            mediaType={mediaType as any}
            title={title}
            posterUrl={posterUrl}
            backdropUrl={backdropUrl}
            rating={rating}
            releaseYear={releaseYear}
          />
        </div>
      </div>

      {/* ── 3. SUB / DUB & SERVER SELECTOR (Part 5 & 16) ── */}
      {sources.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0F172A] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                AUDIO / LANGUAGE:
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#09090C] border border-white/10">
                <button
                  onClick={() => setLanguage("sub")}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    language === "sub"
                      ? "bg-[#FF3B6B] text-white shadow-md shadow-[#FF3B6B]/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  SUB
                </button>
                <button
                  onClick={() => dubCandidates.length > 0 && setLanguage("dub")}
                  disabled={dubCandidates.length === 0}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
                    dubCandidates.length === 0
                      ? "text-zinc-600 cursor-not-allowed"
                      : language === "dub"
                      ? "bg-[#8A5CFF] text-white shadow-md shadow-[#8A5CFF]/30 cursor-pointer"
                      : "text-zinc-400 hover:text-white cursor-pointer"
                  }`}
                  title={dubCandidates.length === 0 ? "Dub audio not available" : "Switch to DUB"}
                >
                  DUB {dubCandidates.length === 0 && <span className="text-[10px] font-normal">(Unavailable)</span>}
                </button>
              </div>
            </div>

            {/* Auto Server indicator */}
            <span className="text-[11px] font-semibold text-zinc-400">
              Active: <strong className="text-white">{sources[activeSourceIndex]?.providerName || "Auto"}</strong>
            </span>
          </div>

          {/* Server Selector: AUTO + More Sources Dropdown */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              PLAYBACK SOURCE:
            </span>

            {/* AUTO Mode Button */}
            <button
              onClick={() => setActiveSourceIndex(0)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeSourceIndex === 0
                  ? "bg-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25 border border-[#FF3B6B]"
                  : "bg-[#09090C] border border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AUTO</span>
              <span className="text-[10px] font-mono opacity-80">
                ({sources[0]?.providerName || "Fastest"})
              </span>
            </button>

            {/* More Sources Dropdown */}
            {sources.length > 1 && (
              <div className="relative group">
                <button
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                    activeSourceIndex > 0
                      ? "bg-white/15 border-white/30 text-white"
                      : "bg-[#09090C] border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span>
                    {activeSourceIndex > 0
                      ? sources[activeSourceIndex]?.providerName || "Selected Source"
                      : "More Sources"}
                  </span>
                  <span className="text-[10px] text-zinc-400">▼</span>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-40 w-64 p-2 rounded-2xl bg-[#12121a] border border-white/15 shadow-2xl backdrop-blur-xl space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-zinc-500 border-b border-white/5">
                    Available Sources ({sources.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {sources.map((source, idx) => {
                      const isSelected = idx === activeSourceIndex;
                      return (
                        <button
                          key={source.providerId + idx}
                          onClick={() => setActiveSourceIndex(idx)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                            isSelected
                              ? "bg-[#FF3B6B] text-white font-bold"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{source.providerName}</span>
                            <span className="text-[10px] text-zinc-400">
                              {source.quality || "1080p HD"} • {source.type?.toUpperCase()}
                            </span>
                          </div>
                          {idx === 0 && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-200">
                              FASTEST
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Episode Navigation (Part 17) ── */}
      {(mediaType === "tv" || mediaType === "anime") && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-[#0F172A] border border-white/[0.08]">
          <button
            onClick={() => hasPrev && handleSelectEpisode(seasonEpisodes[currentEpIndex - 1].episode_number)}
            disabled={!hasPrev || isResolvingNewEpisode}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition ${
              !hasPrev || isResolvingNewEpisode
                ? "border-white/5 text-zinc-600 bg-black/20 cursor-not-allowed"
                : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer"
            }`}
          >
            <IconChevronLeft className="w-3.5 h-3.5" />
            <span>Previous Ep</span>
          </button>

          <span className="text-xs font-extrabold text-zinc-300">
            Episode {currentEpisode} {isResolvingNewEpisode && <span className="text-[#FF3B6B] animate-pulse">…</span>}
          </span>

          <button
            onClick={() => hasNext && handleSelectEpisode(seasonEpisodes[currentEpIndex + 1].episode_number)}
            disabled={!hasNext || isResolvingNewEpisode}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition ${
              !hasNext || isResolvingNewEpisode
                ? "border-white/5 text-zinc-600 bg-black/20 cursor-not-allowed"
                : "border-[#FF3B6B]/40 bg-[#FF3B6B]/15 text-[#FF3B6B] hover:bg-[#FF3B6B]/25 cursor-pointer shadow-md shadow-[#FF3B6B]/10"
            }`}
          >
            <span>Next Ep</span>
            <IconChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 5. Season Navigation Cards ── */}
      {(mediaType === "tv" || mediaType === "anime") && seasons.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
            Seasons & Arcs
          </h3>
          <SeasonSelector
            seasons={seasons}
            selectedSeason={currentSeason}
            onSelectSeason={handleSelectSeason}
          />
        </div>
      )}

      {/* ── 6. Episode List Browser (Part 2) ── */}
      {(mediaType === "tv" || mediaType === "anime") && (
        <EpisodeList
          episodes={seasonEpisodes}
          currentEpisode={currentEpisode}
          onSelectEpisode={(ep) => handleSelectEpisode(ep)}
          tmdbId={tmdbId || anilistId}
          seasonNumber={currentSeason}
        />
      )}

      {/* ── 7. Story Overview & Starring Cast ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0F172A] p-6">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-2">
          Story Overview
        </h3>
        <p className="text-sm text-zinc-300 leading-relaxed max-w-4xl">{overview}</p>

        {cast.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Starring Cast
            </h4>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {cast.map((actor) => {
                const profileUrl = actor.profile_path
                  ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                  : "/placeholder-avatar.png";

                return (
                  <div key={actor.id} className="flex flex-col items-center text-center shrink-0 w-20">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden mb-1.5 bg-black/40 border border-white/10">
                      <Image
                        src={profileUrl}
                        alt={actor.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized={profileUrl.startsWith("http")}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-white truncate w-full">{actor.name}</span>
                    <span className="text-[9px] text-zinc-400 truncate w-full">{actor.character}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 8. Recommended Content Rail ── */}
      {recommendations.length > 0 && (
        <div className="mt-8">
          <MediaRail
            title="More Stories Like This"
            items={recommendations.map((r: any) => ({
              id: r.id,
              title: r.title || r.name || "Untitled",
              posterPath: r.poster_path,
              backdropPath: r.backdrop_path,
              mediaType: mediaType as any,
              rating: r.vote_average,
              releaseYear: (r.release_date || r.first_air_date || "").split("-")[0],
              genres: [],
            }))}
            layout="poster"
          />
        </div>
      )}
    </div>
  );
}
