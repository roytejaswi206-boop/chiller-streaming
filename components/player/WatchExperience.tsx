"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ExternalPlayer } from "@/components/player/ExternalPlayer";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { SeasonSelector, SeasonInfo } from "@/components/player/SeasonSelector";
import { EpisodeList, EpisodeItem } from "@/components/player/EpisodeList";
import { WatchlistButton } from "@/components/player/WatchlistButton";
import { HistoryTracker } from "@/components/player/HistoryTracker";
import { MediaRail } from "@/components/video/MediaRail";
import { IconStar, IconChevronLeft, IconChevronRight } from "@/components/icons";
import { PlaybackCandidate, PlaybackSource, AnimePlaybackVariant, HotSwitchState } from "@/lib/playback/types";
import { TmdbSeasonDetail } from "@/lib/tmdb/client";
import { resolveResumeSourceOfTruth } from "@/lib/playback/resume-service";

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
  const searchParams = useSearchParams();
  const router = useRouter();

  // Language & Hot-Switch Engine State
  const initialVariant: AnimePlaybackVariant =
    searchParams?.get("type") === "dub" ||
    searchParams?.get("variant") === "dub" ||
    searchParams?.get("lang") === "dub"
      ? "dub"
      : "sub";

  const [sources, setSources] = useState<PlaybackCandidate[]>(initialSources);
  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [variant, setVariant] = useState<AnimePlaybackVariant>(initialVariant);
  const [language, setLanguage] = useState<"sub" | "dub">(initialVariant === "dub" ? "dub" : "sub");
  const [hotSwitchState, setHotSwitchState] = useState<HotSwitchState>("IDLE");
  const [hotSwitchFeedback, setHotSwitchFeedback] = useState<string | null>(null);

  // Position & Playback tracking for Hot-Switch
  const capturedPositionRef = React.useRef<number>(0);
  const capturedIsPlayingRef = React.useRef<boolean>(true);
  const requestGenerationRef = React.useRef<number>(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const episodeRequestGenRef = React.useRef<number>(0);
  const episodeAbortCtrlRef = React.useRef<AbortController | null>(null);

  const [autoPlay, setAutoPlay] = useState(true);
  const [autoNext, setAutoNext] = useState(true);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [seasonEpisodes, setSeasonEpisodes] = useState<EpisodeItem[]>(
    currentSeasonDetails?.episodes || []
  );
  const [isResolvingNewEpisode, setIsResolvingNewEpisode] = useState(false);
  const [, startTransition] = useTransition();

  // Navigation & Fullscreen State
  const [playerReloadKey, setPlayerReloadKey] = useState(0);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const [recommendationSections, setRecommendationSections] = useState<any[]>([]);

  // Controlled Source Dropdown
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const sourceDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close source dropdown when clicking, touching outside or pressing Escape
  useEffect(() => {
    if (!sourceDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sourceDropdownOpen]);

  // Back Navigation Handler
  const handleGoBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      const fallbackRoute = mediaType === "anime" ? "/anime" : mediaType === "tv" ? "/tv" : "/movies";
      router.push(fallbackRoute);
    }
  }, [router, mediaType]);

  // Resume Source of Truth (Section 1: Auth DB > Guest Storage > Explicit URL Override)
  const { data: session } = useSession();
  const [authHistory, setAuthHistory] = useState<any[]>([]);
  const [resolvedResumeTime, setResolvedResumeTime] = useState<number>(0);

  // Asynchronous Non-Blocking Smart Recommendations (Sections 25-46)
  useEffect(() => {
    let isMounted = true;
    const fetchSmartRecs = async () => {
      try {
        const id = tmdbId || anilistId || slug;
        const genresParam = genres.length > 0 ? `&genres=${encodeURIComponent(genres.join(","))}` : "";
        const titleParam = title ? `&title=${encodeURIComponent(title)}` : "";
        const res = await fetch(
          `/api/content/recommendations?type=${mediaType}&id=${id}${genresParam}${titleParam}&limit=18`
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.sections && data.sections.length > 0) {
            setRecommendationSections(data.sections);
          }
        }
      } catch {
        // Fallback to props recommendations non-blockingly
      }
    };

    fetchSmartRecs();
    return () => {
      isMounted = false;
    };
  }, [mediaType, tmdbId, anilistId, slug, title, genres]);

  // Fetch authenticated user history from database
  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/history")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.items) {
            setAuthHistory(data.items);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  // Read stored preference for Anime on mount
  useEffect(() => {
    if (mediaType === "anime") {
      try {
        const stored = localStorage.getItem("chiller_anime_preferred_variant");
        if (stored === "dub" || stored === "sub") {
          const urlType = searchParams?.get("type") || searchParams?.get("variant") || searchParams?.get("lang");
          if (!urlType && stored !== initialVariant) {
            setVariant(stored as AnimePlaybackVariant);
            setLanguage(stored as "sub" | "dub");
          }
        }
      } catch {}
    }
  }, [mediaType, searchParams, initialVariant]);

  // Resolve True Resume position (Sections 1, 2, 14, 15)
  useEffect(() => {
    const rawT = searchParams?.get("t");
    const parsedT = rawT ? parseFloat(rawT) : undefined;
    const isExplicitResume = Boolean(
      searchParams?.get("resume") === "1" ||
      searchParams?.get("resume") === "true" ||
      (parsedT !== undefined && parsedT > 0)
    );

    const result = resolveResumeSourceOfTruth({
      mediaType: mediaType as any,
      tmdbId,
      anilistId,
      season: currentSeason,
      episode: currentEpisode,
      urlTime: parsedT,
      isExplicitResumeUrl: isExplicitResume,
      authDbItems: authHistory,
    });

    setResolvedResumeTime(result.position);
    capturedPositionRef.current = result.position;
  }, [mediaType, tmdbId, anilistId, currentSeason, currentEpisode, searchParams, authHistory]);

  const handlePlaybackProgress = useCallback((cur: number, dur: number, playing: boolean) => {
    capturedPositionRef.current = cur;
    capturedIsPlayingRef.current = playing;
  }, []);

  // Helper to construct shareable clean URL
  const buildWatchUrl = useCallback(
    (s: number, e: number, varType = variant) => {
      if (mediaType === "movie") return `/watch/movie/${tmdbId || slug}`;
      const base = mediaType === "anime" ? `/watch/anime/${anilistId || tmdbId || slug}` : `/watch/tv/${tmdbId || slug}`;
      const audioParam = searchParams.get("audio") ? `&audio=${encodeURIComponent(searchParams.get("audio")!)}` : "";
      return `${base}?s=${s}&e=${e}${varType === "dub" ? "&type=dub" : ""}${audioParam}`;
    },
    [mediaType, tmdbId, anilistId, slug, variant, searchParams]
  );

  // ── SEAMLESS SUB ↔ DUB HOT-SWITCH ENGINE ──
  const handleHotSwitchVariant = useCallback(
    async (targetVariant: "sub" | "dub") => {
      if (targetVariant === variant && hotSwitchState !== "FAILED") return;

      // 1. Capture current playback position and state
      const currentPos = capturedPositionRef.current || resolvedResumeTime || 0;
      const isPlaying = capturedIsPlayingRef.current;
      const previousSources = [...sources];
      const previousVariant = variant;
      const generation = ++requestGenerationRef.current;

      // 2. Abort previous pending resolution
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // 3. Optimistic state transition
      setHotSwitchState("RESOLVING_VARIANT");
      setHotSwitchFeedback(`Switching to ${targetVariant.toUpperCase()}…`);
      setVariant(targetVariant);
      setLanguage(targetVariant);

      // Persist user preference
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("chiller_anime_preferred_variant", targetVariant);
        } catch {}
      }

      try {
        const id = anilistId || tmdbId || slug;
        const res = await fetch(
          `/api/playback/resolve?type=${mediaType}&id=${id}&s=${currentSeason}&e=${currentEpisode}&variant=${targetVariant}&lang=${targetVariant}&t=${Math.floor(currentPos)}`,
          { signal: controller.signal }
        );

        if (generation !== requestGenerationRef.current) {
          return; // Discard stale response
        }

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        if (generation !== requestGenerationRef.current) return;

        if (data.success && data.candidates && data.candidates.length > 0) {
          // 4. Source resolution succeeded -> Switch playback source & restore timestamp
          setHotSwitchState("SWITCHING");
          setSources(data.candidates);
          setActiveSourceIndex(0);
          setResolvedResumeTime(currentPos);
          setPlayerReloadKey((k) => k + 1);

          // 5. Update URL state without page reload
          const nextUrl = buildWatchUrl(currentSeason, currentEpisode, targetVariant);
          window.history.replaceState(null, "", nextUrl);

          // 6. Transition through SEEKING -> READY
          setHotSwitchState("SEEKING");
          setTimeout(() => {
            if (generation === requestGenerationRef.current) {
              setHotSwitchState("READY");
              const timeStr = currentPos > 0 ? ` at ${Math.floor(currentPos / 60)}:${String(Math.floor(currentPos % 60)).padStart(2, "0")}` : "";
              setHotSwitchFeedback(`${targetVariant.toUpperCase()} active${timeStr}`);
              setTimeout(() => {
                if (generation === requestGenerationRef.current) {
                  setHotSwitchFeedback(null);
                  setHotSwitchState("IDLE");
                }
              }, 3000);
            }
          }, 800);
        } else {
          throw new Error(`No ${targetVariant.toUpperCase()} sources available`);
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          return;
        }
        if (generation !== requestGenerationRef.current) return;

        console.warn(`[Hot-Switch] Failed to resolve ${targetVariant.toUpperCase()}:`, err.message);

        // Rollback: Keep active playback intact!
        setHotSwitchState("FAILED");
        setSources(previousSources);
        setVariant(previousVariant);
        setLanguage(previousVariant === "dub" ? "dub" : "sub");
        setHotSwitchFeedback(`${targetVariant.toUpperCase()} isn't available from current sources. Playing ${previousVariant.toUpperCase()}.`);
        setTimeout(() => {
          if (generation === requestGenerationRef.current) {
            setHotSwitchFeedback(null);
            setHotSwitchState("IDLE");
          }
        }, 4000);
      }
    },
    [variant, hotSwitchState, sources, resolvedResumeTime, anilistId, tmdbId, slug, mediaType, currentSeason, currentEpisode, buildWatchUrl]
  );

  // Client-side episode resolution without full-page reload
  const handleSelectEpisode = useCallback(
    async (episodeNum: number, seasonNum = currentSeason) => {
      if (episodeNum === currentEpisode && seasonNum === currentSeason) return;

      // 1. Abort previous in-flight episode resolution
      if (episodeAbortCtrlRef.current) {
        episodeAbortCtrlRef.current.abort();
      }
      const controller = new AbortController();
      episodeAbortCtrlRef.current = controller;

      // 2. Increment request generation to protect against race conditions
      const generation = ++episodeRequestGenRef.current;

      setIsResolvingNewEpisode(true);
      setCurrentEpisode(episodeNum);
      setCurrentSeason(seasonNum);
      setResolvedResumeTime(0);
      capturedPositionRef.current = 0;

      // Preserve preferred variant across episodes (Section 22, 23)
      const targetVariant = variant;
      const nextUrl = buildWatchUrl(seasonNum, episodeNum, targetVariant);
      window.history.pushState(null, "", nextUrl);

      try {
        const id = tmdbId || anilistId;
        const audioParam = searchParams.get("audio") ? `&audio=${encodeURIComponent(searchParams.get("audio")!)}` : "";
        const res = await fetch(
          `/api/playback/resolve?type=${mediaType}&id=${id}&s=${seasonNum}&e=${episodeNum}&variant=${targetVariant}&lang=${targetVariant}${audioParam}`,
          { signal: controller.signal }
        );

        if (generation !== episodeRequestGenRef.current) return; // Stale response discarded

        if (res.ok) {
          const data = await res.json();
          if (generation !== episodeRequestGenRef.current) return;

          if (data.candidates && data.candidates.length > 0) {
            setSources(data.candidates);
            setActiveSourceIndex(0);
          } else if (targetVariant === "dub") {
            // Fallback to SUB if DUB not available for this episode
            setHotSwitchFeedback("DUB unavailable for this episode. Playing SUB.");
            setVariant("sub");
            setLanguage("sub");
            const subRes = await fetch(
              `/api/playback/resolve?type=${mediaType}&id=${id}&s=${seasonNum}&e=${episodeNum}&variant=sub&lang=sub${audioParam}`,
              { signal: controller.signal }
            );
            if (generation !== episodeRequestGenRef.current) return;

            if (subRes.ok) {
              const subData = await subRes.json();
              if (generation !== episodeRequestGenRef.current) return;
              if (subData.candidates && subData.candidates.length > 0) {
                setSources(subData.candidates);
                setActiveSourceIndex(0);
              }
            }
            setTimeout(() => {
              if (generation === episodeRequestGenRef.current) {
                setHotSwitchFeedback(null);
              }
            }, 3500);
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        if (generation !== episodeRequestGenRef.current) return;
        console.error("Episode resolution error:", err);
      } finally {
        if (generation === episodeRequestGenRef.current) {
          setIsResolvingNewEpisode(false);
        }
      }
    },
    [currentEpisode, currentSeason, buildWatchUrl, tmdbId, anilistId, mediaType, variant, searchParams]
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
        const audioParam = searchParams.get("audio") ? `&audio=${encodeURIComponent(searchParams.get("audio")!)}` : "";
        fetch(`/api/playback/resolve?type=${mediaType}&id=${id}&s=${currentSeason}&e=${nextEp}&lang=${language}${audioParam}`).catch(() => {});
      }
    }
  }, [currentEpisode, currentSeason, mediaType, tmdbId, anilistId, language, searchParams]);

  // Current episode details
  const currentEpInfo = seasonEpisodes.find((ep) => ep.episode_number === currentEpisode);
  const currentEpIndex = seasonEpisodes.findIndex((ep) => ep.episode_number === currentEpisode);
  const hasPrev = currentEpIndex > 0;
  const hasNext = currentEpIndex >= 0 && currentEpIndex < seasonEpisodes.length - 1;

  // Auto Next Episode Countdown Prompt State (Sections 23, 24, 35)
  const [nextEpisodePrompt, setNextEpisodePrompt] = useState<{
    active: boolean;
    season: number;
    episode: number;
    title?: string;
    countdown: number;
  } | null>(null);

  const handleTriggerNextEpisode = useCallback(async () => {
    if (!autoNext || mediaType === "movie") return;
    const id = tmdbId || anilistId;
    if (!id) return;

    try {
      const res = await fetch(
        `/api/playback/next-episode?type=${mediaType}&id=${id}&s=${currentSeason}&e=${currentEpisode}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.hasNext) {
          setNextEpisodePrompt({
            active: true,
            season: data.nextSeason,
            episode: data.nextEpisode,
            title: data.nextTitle,
            countdown: 6,
          });
          return;
        }
      }
    } catch {
      // Fallback
    }

    if (hasNext) {
      const nextEp = seasonEpisodes[currentEpIndex + 1];
      setNextEpisodePrompt({
        active: true,
        season: currentSeason,
        episode: nextEp.episode_number,
        title: nextEp.name,
        countdown: 6,
      });
    }
  }, [autoNext, mediaType, tmdbId, anilistId, currentSeason, currentEpisode, hasNext, seasonEpisodes, currentEpIndex]);

  // Auto Next countdown effect
  useEffect(() => {
    if (!nextEpisodePrompt?.active) return;
    if (nextEpisodePrompt.countdown <= 0) {
      handleSelectEpisode(nextEpisodePrompt.episode, nextEpisodePrompt.season);
      setNextEpisodePrompt(null);
      return;
    }

    const timer = setTimeout(() => {
      setNextEpisodePrompt((prev) => (prev ? { ...prev, countdown: prev.countdown - 1 } : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [nextEpisodePrompt, handleSelectEpisode]);

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

      {/* ── Top Navigation & Utility Bar (Back, Breadcrumbs, Website Refresh) ── */}
      {!isPlayerFullscreen && (
        <div className="flex items-center justify-between gap-3 py-1 px-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGoBack}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-zinc-200 hover:text-white text-xs font-bold transition-all touch-manipulation cursor-pointer border border-white/10 shadow-sm"
              title="Go back to previous page"
              aria-label="Go back"
            >
              <IconChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
              <Link href="/" className="hover:text-white transition touch-manipulation">Home</Link>
              <span>/</span>
              <Link
                href={mediaType === "anime" ? "/anime" : mediaType === "tv" ? "/tv" : "/movies"}
                className="capitalize hover:text-white transition touch-manipulation"
              >
                {mediaType}
              </Link>
              <span>/</span>
              <span className="text-zinc-200 font-semibold truncate max-w-[180px] md:max-w-xs">{title}</span>
              {mediaType !== "movie" && (
                <span className="text-[#FF3B6B] font-mono text-[11px] font-bold">
                  S{currentSeason}:E{currentEpisode}
                </span>
              )}
            </div>
          </div>

          {/* Website Page Refresh Button (Distinct from player recovery) */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all touch-manipulation cursor-pointer bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10 active:scale-95 shadow-sm"
            title="Refresh website page"
            aria-label="Refresh Page"
          >
            <svg className="w-3.5 h-3.5 text-[#FF3B6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden xs:inline">Refresh Page</span>
          </button>
        </div>
      )}

      {/* ── Auto Next Episode Countdown Prompt Banner (Sections 23, 24, 35) ── */}
      {!isPlayerFullscreen && nextEpisodePrompt?.active && (
        <div className="relative z-30 p-4 rounded-2xl bg-gradient-to-r from-[#1E1B4B]/95 via-[#0F172A]/95 to-[#1E1B4B]/95 border border-[#8A5CFF]/40 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8A5CFF]/20 border border-[#8A5CFF]/30 flex items-center justify-center text-xl shrink-0">
              ⏱️
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#A78BFA]">
                UP NEXT IN {nextEpisodePrompt.countdown}s
              </p>
              <p className="text-sm font-bold text-white">
                Season {nextEpisodePrompt.season} Episode {nextEpisodePrompt.episode}
                {nextEpisodePrompt.title ? `: ${nextEpisodePrompt.title}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleSelectEpisode(nextEpisodePrompt.episode, nextEpisodePrompt.season);
                setNextEpisodePrompt(null);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#FF5A85] text-white text-xs font-black shadow-lg shadow-[#FF3B6B]/25 hover:brightness-110 active:scale-95 transition touch-manipulation cursor-pointer"
            >
              PLAY NOW
            </button>
            <button
              onClick={() => setNextEpisodePrompt(null)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-zinc-300 hover:text-white text-xs font-bold transition touch-manipulation cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* ── 1. Video Player Container ── */}
      <div className="w-full">
        {sourceType === "EXTERNAL" && sources.length > 0 ? (
          <ExternalPlayer
            key={playerReloadKey}
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
            initialResumeTime={resolvedResumeTime}
            onEnded={handleTriggerNextEpisode}
            onToggleAutoPlay={() => setAutoPlay((v) => !v)}
            onToggleAutoNext={() => setAutoNext((v) => !v)}
            onNextEpisode={(nextS, nextE) => handleSelectEpisode(nextE, nextS)}
            onPrevEpisode={() => hasPrev && handleSelectEpisode(seasonEpisodes[currentEpIndex - 1].episode_number)}
            hasNextEpisode={hasNext}
            hasPrevEpisode={hasPrev}
            onSelectSourceIndex={(idx) => setActiveSourceIndex(idx)}
            onPlaybackProgress={handlePlaybackProgress}
            onFullscreenChange={setIsPlayerFullscreen}
          />
        ) : sourceType === "OWNED" && streamUrl ? (
          <VideoPlayer
            key={playerReloadKey}
            streamUrl={streamUrl}
            backupStreamUrls={backupStreamUrls}
            title={title}
            posterUrl={backdropUrl || posterUrl}
            subtitles={subtitles}
            qualities={qualities}
            autoPlay={autoPlay}
            initialTime={resolvedResumeTime}
            onEnded={handleTriggerNextEpisode}
            onFullscreenChange={setIsPlayerFullscreen}
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

      {/* ── Surrounding Watch Experience (Hidden in Fullscreen - Sections 6-12) ── */}
      {!isPlayerFullscreen && (
        <>
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

      {/* ── 3. SUB / DUB & SERVER SELECTOR (Hot-Switch Engine) ── */}
      {sources.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0F172A] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                AUDIO / LANGUAGE:
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#09090C] border border-white/10 shadow-inner">
                {/* SUB Button */}
                <button
                  type="button"
                  id="chiller-sub-btn"
                  onClick={() => handleHotSwitchVariant("sub")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all touch-manipulation active:scale-95 cursor-pointer ${
                    variant === "sub"
                      ? "bg-[#FF3B6B] text-white shadow-md shadow-[#FF3B6B]/30 ring-1 ring-white/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                  aria-pressed={variant === "sub"}
                  title="Switch to Japanese Audio with Subtitles"
                >
                  <span>SUB</span>
                  {variant === "sub" && <span className="text-[10px] font-black">✓</span>}
                  {hotSwitchState === "RESOLVING_VARIANT" && variant === "sub" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  )}
                </button>

                {/* DUB Button */}
                <button
                  type="button"
                  id="chiller-dub-btn"
                  onClick={() => handleHotSwitchVariant("dub")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all touch-manipulation active:scale-95 cursor-pointer ${
                    variant === "dub"
                      ? "bg-[#8A5CFF] text-white shadow-md shadow-[#8A5CFF]/30 ring-1 ring-white/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                  aria-pressed={variant === "dub"}
                  title="Switch to English Dub Audio"
                >
                  <span>DUB</span>
                  {variant === "dub" && <span className="text-[10px] font-black">✓</span>}
                  {hotSwitchState === "RESOLVING_VARIANT" && variant === "dub" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  )}
                </button>
              </div>

              {/* Status / Feedback badge */}
              {hotSwitchFeedback && (
                <span
                  id="chiller-variant-status-badge"
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg animate-in fade-in slide-in-from-left-2 duration-200 ${
                    hotSwitchState === "FAILED"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-[#8A5CFF]/20 text-[#A78BFA] border border-[#8A5CFF]/30"
                  }`}
                >
                  {hotSwitchFeedback}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Auto Next Toggle Button (Section 23, 35) */}
              {mediaType !== "movie" && (
                <button
                  type="button"
                  onClick={() => setAutoNext((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all touch-manipulation active:scale-95 cursor-pointer ${
                    autoNext
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10"
                      : "bg-[#09090C] text-zinc-500 border-white/10 hover:text-zinc-300"
                  }`}
                  title="Automatically load and play next episode"
                >
                  <span className={`w-2 h-2 rounded-full ${autoNext ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                  <span>AUTO NEXT: {autoNext ? "ON" : "OFF"}</span>
                </button>
              )}

              {/* Auto Server indicator */}
              <span className="text-[11px] font-semibold text-zinc-400">
                Active: <strong className="text-white">{sources[activeSourceIndex]?.providerName || "Auto"}</strong>
              </span>
            </div>
          </div>

          {/* Server Selector: AUTO + More Sources Dropdown */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              PLAYBACK SOURCE:
            </span>

            {/* AUTO Mode Button */}
            <button
              type="button"
              onClick={() => setActiveSourceIndex(0)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all touch-manipulation active:scale-95 cursor-pointer ${
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

            {/* More Sources Dropdown (Touch-hardened controlled state) */}
            {sources.length > 1 && (
              <div className="relative" ref={sourceDropdownRef}>
                <button
                  type="button"
                  onClick={() => setSourceDropdownOpen((v) => !v)}
                  aria-expanded={sourceDropdownOpen}
                  aria-haspopup="listbox"
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all touch-manipulation active:scale-95 cursor-pointer ${
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
                  <span className={`text-[10px] text-zinc-400 transition-transform duration-200 ${sourceDropdownOpen ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>

                {/* Dropdown Menu */}
                {sourceDropdownOpen && (
                  <div className="absolute left-0 bottom-full mb-2 z-40 w-64 max-w-[calc(100vw-2rem)] p-2 rounded-2xl bg-[#12121a] border border-white/15 shadow-2xl backdrop-blur-xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-zinc-500 border-b border-white/5 flex items-center justify-between">
                      <span>Available Sources ({sources.length})</span>
                      <span className="text-[9px] text-zinc-400">Tap to switch</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {sources.map((source, idx) => {
                        const isSelected = idx === activeSourceIndex;
                        return (
                          <button
                            type="button"
                            key={source.providerId + idx}
                            onClick={() => {
                              setActiveSourceIndex(idx);
                              setSourceDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all touch-manipulation active:scale-[0.98] cursor-pointer text-left ${
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
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Episode Navigation (Part 17) ── */}
      {(mediaType === "tv" || mediaType === "anime") && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-[#0F172A] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => hasPrev && handleSelectEpisode(seasonEpisodes[currentEpIndex - 1].episode_number)}
            disabled={!hasPrev || isResolvingNewEpisode}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all touch-manipulation ${
              !hasPrev || isResolvingNewEpisode
                ? "border-white/5 text-zinc-600 bg-black/20 cursor-not-allowed"
                : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer shadow-sm"
            }`}
          >
            <IconChevronLeft className="w-3.5 h-3.5" />
            <span>Previous Ep</span>
          </button>

          <span className="text-xs font-extrabold text-zinc-300">
            Episode {currentEpisode} {isResolvingNewEpisode && <span className="text-[#FF3B6B] animate-pulse">…</span>}
          </span>

          <button
            type="button"
            onClick={() => hasNext && handleSelectEpisode(seasonEpisodes[currentEpIndex + 1].episode_number)}
            disabled={!hasNext || isResolvingNewEpisode}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all touch-manipulation ${
              !hasNext || isResolvingNewEpisode
                ? "border-white/5 text-zinc-600 bg-black/20 cursor-not-allowed"
                : "border-[#FF3B6B]/40 bg-[#FF3B6B]/15 text-[#FF3B6B] hover:bg-[#FF3B6B]/25 active:scale-95 cursor-pointer shadow-md shadow-[#FF3B6B]/10"
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

      {/* ── 8. Smart Multi-Rail Content Recommendations (Sections 25-46) ── */}
      {recommendationSections.length > 0 ? (
        <div className="mt-8 space-y-6">
          {recommendationSections.map((section: any) => (
            <MediaRail
              key={section.id}
              title={section.title}
              items={section.items.map((item: any) => ({
                id: item.id,
                title: item.title,
                posterPath: item.posterPath,
                backdropPath: item.backdropPath,
                mediaType: item.mediaType,
                rating: item.rating,
                releaseYear: item.releaseYear,
                genres: item.genres,
                badges: item.badges,
              }))}
              layout={section.layout || "poster"}
              seeAllHref={section.seeAllHref}
            />
          ))}
        </div>
      ) : recommendations.length > 0 ? (
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
      ) : null}
        </>
      )}
    </div>
  );
}
