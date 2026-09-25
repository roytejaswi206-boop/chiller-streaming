"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { IconFullscreen, IconRotate, IconShield, IconSettings } from "@/components/icons";
import { PlaybackCandidate, ContentPlaybackStatus, PlaybackTelemetry } from "@/lib/playback/types";
import { getProviderEmbedPolicy, validateProviderUrl, SafetyTier } from "@/lib/playback/embed-policy";
import {
  NormalizedAudioTrack,
  normalizeAudioTracks,
  selectBestAudioTrack,
  getStoredAudioPreference,
  setStoredAudioPreference,
  AudioTrackStatus,
} from "@/lib/playback/audio-normalizer";

interface ExternalPlayerProps {
  sources: PlaybackCandidate[];
  title: string;
  posterUrl?: string;
  mediaType?: "movie" | "tv" | "anime";
  tmdbId?: number;
  anilistId?: number;
  season?: number;
  episode?: number;
  initialResumeTime?: number;
  onEnded?: () => void;
  onNextEpisode?: (nextSeason: number, nextEpisode: number) => void;
  onPrevEpisode?: () => void;
  hasPrevEpisode?: boolean;
  hasNextEpisode?: boolean;
  autoPlay?: boolean;
  autoNext?: boolean;
  activeSourceIndex?: number;
  onToggleAutoPlay?: () => void;
  onToggleAutoNext?: () => void;
  onSelectSourceIndex?: (index: number) => void;
  onPlaybackProgress?: (currentTime: number, duration: number, isPlaying: boolean) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

// Fallback retry delay (ms)
const FALLBACK_COOLDOWN_MS = 600;
// Maximum load timeout before auto-offering fallback (ms)
const LOAD_TIMEOUT_MS = 10000;
// Debounce for progress saves (ms)
const PROGRESS_DEBOUNCE_MS = 10000;
// Auto-hide controls duration (ms) - Section 4
export const PLAYER_CONTROLS_AUTO_HIDE_MS = 3000;

export function ExternalPlayer({
  sources = [],
  title,
  posterUrl,
  mediaType = "movie",
  tmdbId,
  anilistId,
  season,
  episode,
  initialResumeTime,
  onEnded,
  onNextEpisode,
  onPrevEpisode,
  hasPrevEpisode,
  hasNextEpisode,
  autoPlay = true,
  autoNext = true,
  activeSourceIndex,
  onToggleAutoPlay,
  onToggleAutoNext,
  onSelectSourceIndex,
  onPlaybackProgress,
  onFullscreenChange,
}: ExternalPlayerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchMsg, setSwitchMsg] = useState("");
  const [iframeKey, setIframeKey] = useState(0);
  const [playbackState, setPlaybackState] = useState<ContentPlaybackStatus>("CONNECTING");
  const [loadTimeoutReached, setLoadTimeoutReached] = useState(false);
  const [diagnosticSource, setDiagnosticSource] = useState<string | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  // ── Auto-Hide Controls & Clean Cinema Mode (Sections 3, 4, 5, 8, 44, 48) ──
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Audio Multi-Language State (Sections 31-42) ──
  const [availableAudioTracks, setAvailableAudioTracks] = useState<NormalizedAudioTrack[]>([]);
  const [activeAudioLang, setActiveAudioLang] = useState<string>(() => getStoredAudioPreference());
  const [audioSwitchStatus, setAudioSwitchStatus] = useState<AudioTrackStatus>("UNKNOWN");
  const [audioFeedbackToast, setAudioFeedbackToast] = useState<string | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>("Auto");
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("Off");

  // Safety & Redirect Protection State
  const [safetyMode, setSafetyMode] = useState<"SAFE" | "COMPATIBILITY" | "RELAXED">("SAFE");
  const [showSafetySheet, setShowSafetySheet] = useState(false);

  // Orientation & Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [orientationHint, setOrientationHint] = useState<string | null>(null);

  // Safe Intro Range Detection
  const [detectedIntroRange, setDetectedIntroRange] = useState<{ start: number; end: number } | null>(null);
  const [currentPlaybackSec, setCurrentPlaybackSec] = useState<number>(0);

  // ── True Resume System State (Sections 17-23, 27-30) ──
  const [resumeTime, setResumeTime] = useState<number | null>(initialResumeTime || null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeFeedback, setResumeFeedback] = useState<string | null>(null);
  const [resumeConfirmed, setResumeConfirmed] = useState(false);
  const resumeAppliedRef = useRef(false);
  const lastRecordedPositionRef = useRef<number>(0);
  const lastDurationRef = useRef<number>(0);
  const lastTimeupdateTickRef = useRef<number>(0);

  // Startup telemetry
  const [telemetry, setTelemetry] = useState<PlaybackTelemetry>({
    playerMount: Date.now(),
  });

  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackCooling = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const activeSource = sources[activeIndex] ?? null;
  const allFailed = sources.length === 0 || failedIndices.size >= sources.length;
  const isDev = process.env.NODE_ENV === "development";

  // Provider embed security policy
  const embedPolicy = activeSource
    ? getProviderEmbedPolicy(activeSource.providerId, safetyMode)
    : getProviderEmbedPolicy("unknown", safetyMode);

  // Validate active URL before rendering
  const validatedUrl = activeSource
    ? validateProviderUrl(activeSource.url, activeSource.providerId)
    : { valid: false, sanitizedUrl: "" };

  // ─────────────────────────────────────────────────────────────────
  // UNIFIED AUTO-HIDE CONTROLS ENGINE (Sections 4, 5, 8, 44, 45, 46)
  // ─────────────────────────────────────────────────────────────────
  const resetControlsTimeout = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    // Do NOT auto-hide if paused, in error, or a settings/sheet menu is open (Section 5)
    if (
      !isPaused &&
      !showSettingsMenu &&
      !showSafetySheet &&
      !showDiag &&
      !allFailed &&
      ["PLAYBACK_CONFIRMED", "PLAYER_READY", "EMBED_LOADED"].includes(playbackState)
    ) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, PLAYER_CONTROLS_AUTO_HIDE_MS);
    }
  }, [isPaused, showSettingsMenu, showSafetySheet, showDiag, allFailed, playbackState]);

  // Keep controls visible whenever menu opens or paused state changes
  useEffect(() => {
    if (isPaused || showSettingsMenu || showSafetySheet || showDiag) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    } else {
      resetControlsTimeout();
    }
  }, [isPaused, showSettingsMenu, showSafetySheet, showDiag, resetControlsTimeout]);

  // Keyboard accessibility reveals controls (Section 9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if ([" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "f", "F", "m", "M", "Escape"].includes(e.key)) {
        resetControlsTimeout();
      }
      if (e.key === "Escape") {
        setShowSettingsMenu(false);
        setShowSafetySheet(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resetControlsTimeout]);

  // Cleanup auto-hide timer on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      onFullscreenChange?.(isFull);

      // When leaving fullscreen, unlock orientation if supported
      if (!isFull) {
        if (typeof screen !== "undefined" && screen.orientation && typeof screen.orientation.unlock === "function") {
          try {
            screen.orientation.unlock();
          } catch {
            // Ignore
          }
        }
        setIsLandscape(false);
      }
    };

    const handleOrientationChange = () => {
      if (typeof window !== "undefined") {
        const isLand =
          window.innerWidth > window.innerHeight ||
          (screen.orientation?.type?.includes("landscape") ?? false);
        setIsLandscape(isLand);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleOrientationChange);
    if (typeof screen !== "undefined" && screen.orientation) {
      screen.orientation.addEventListener("change", handleOrientationChange);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleOrientationChange);
      if (typeof screen !== "undefined" && screen.orientation) {
        screen.orientation.removeEventListener("change", handleOrientationChange);
      }
    };
  }, [onFullscreenChange]);

  // Lock body scroll when fullscreen is active
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const handleFullscreen = async () => {
    const container = playerContainerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
          setIsFullscreen(true);
          onFullscreenChange?.(true);
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
          setIsFullscreen(true);
          onFullscreenChange?.(true);
        } else {
          // Fallback for mobile browsers where container fullscreen is restricted
          setIsFullscreen((prev) => {
            const next = !prev;
            onFullscreenChange?.(next);
            return next;
          });
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
        onFullscreenChange?.(false);
      }
    } catch {
      // Non-blocking fallback for browsers rejecting div fullscreen
      setIsFullscreen((prev) => {
        const next = !prev;
        onFullscreenChange?.(next);
        return next;
      });
    }
  };

  const handlePlayerSurfaceClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // If clicking an interactive button or control, allow normal bubbling
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, [role='button']")) return;
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleQuickReload = useCallback(() => {
    setIsLoading(true);
    setIframeKey((k) => k + 1);
    resetControlsTimeout();
    setResumeFeedback("Reloading stream…");
    setTimeout(() => setResumeFeedback(null), 2500);
  }, [resetControlsTimeout]);

  /**
   * ROTATE BUTTON ACTION (Sections 19, 20, 21, 22)
   * 1. Enters container fullscreen if not already fullscreen.
   * 2. Calls screen.orientation.lock("landscape") directly inside user activation.
   * 3. Gracefully catches exceptions on unsupported browsers with helpful hint.
   */
  const handleRotate = async () => {
    const container = playerContainerRef.current;

    try {
      // 1. Enter fullscreen if needed
      if (!document.fullscreenElement && container) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        }
      }

      // 2. Lock or unlock orientation
      const orientationApi = typeof screen !== "undefined" ? (screen.orientation as any) : null;
      if (orientationApi && typeof orientationApi.lock === "function") {
        if (isLandscape) {
          try {
            if (typeof orientationApi.unlock === "function") {
              await orientationApi.unlock();
            }
          } catch {
            // Ignore
          }
          setIsLandscape(false);
        } else {
          await orientationApi.lock("landscape");
          setIsLandscape(true);
        }
      } else {
        // Graceful hint for iOS Safari / browsers where screen.orientation.lock is restricted
        setOrientationHint("Rotate your device for landscape viewing.");
        setTimeout(() => setOrientationHint(null), 3500);
      }
    } catch (err: any) {
      // Browser refused orientation lock or unsupported
      setOrientationHint("Rotate your device for landscape viewing.");
      setTimeout(() => setOrientationHint(null), 3500);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // WATCH PROGRESS PERSISTENCE
  // ─────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────
  // WATCH PROGRESS PERSISTENCE (Sections 3, 4, 18, 19, 20)
  // ─────────────────────────────────────────────────────────────────
  const saveProgressImmediate = useCallback(
    (currentTime: number, duration: number) => {
      if (!tmdbId && !anilistId) return;
      if (!Number.isFinite(currentTime) || currentTime < 0) return;

      const isCompleted = duration > 0 && currentTime / duration >= 0.95;
      const progressSeconds = Math.floor(currentTime);
      const durationSeconds = Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 0;

      const progressData = {
        currentTime: progressSeconds,
        duration: durationSeconds,
        progressSeconds,
        durationSeconds,
        season: season || 1,
        episode: episode || 1,
        completed: isCompleted,
        providerId: activeSource?.providerId,
        savedAt: new Date().toISOString(),
      };

      try {
        const key =
          mediaType === "tv" || mediaType === "anime"
            ? `chiller_progress_tv_${tmdbId || anilistId}_s${season || 1}_e${episode || 1}`
            : `chiller_progress_${mediaType}_${tmdbId || anilistId}`;

        localStorage.setItem(key, JSON.stringify(progressData));

        // Update local chiller_history array for instant Continue Watching rail consistency
        const histRaw = localStorage.getItem("chiller_history");
        if (histRaw) {
          const hist = JSON.parse(histRaw);
          if (Array.isArray(hist)) {
            const idx = hist.findIndex((h: any) =>
              tmdbId ? h.tmdbId === tmdbId : h.id === tmdbId || h.id === anilistId
            );
            if (idx !== -1) {
              hist[idx].progressSeconds = progressSeconds;
              hist[idx].durationSeconds = durationSeconds;
              hist[idx].seasonNumber = season || 1;
              hist[idx].episodeNumber = episode || 1;
              hist[idx].lastWatchedAt = new Date().toISOString();
              localStorage.setItem("chiller_history", JSON.stringify(hist));
            }
          }
        }

        // Keepalive sync to server database (Section 3 & 20)
        fetch("/api/user/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId,
            mediaType,
            title,
            posterUrl,
            season: season || 1,
            episode: episode || 1,
            progressSeconds,
            durationSeconds,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Non-blocking quota error handling
      }
    },
    [tmdbId, anilistId, mediaType, season, episode, activeSource, title, posterUrl]
  );

  const saveProgress = useCallback(
    (currentTime: number, duration: number) => {
      lastRecordedPositionRef.current = currentTime;
      lastDurationRef.current = duration;
      onPlaybackProgress?.(currentTime, duration, !isPaused);

      if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);

      progressSaveTimer.current = setTimeout(() => {
        saveProgressImmediate(currentTime, duration);
      }, PROGRESS_DEBOUNCE_MS);
    },
    [saveProgressImmediate, onPlaybackProgress, isPaused]
  );

  // Continuous playback time ticker for real-time position capturing
  useEffect(() => {
    if (["PLAYBACK_CONFIRMED", "PLAYER_READY"].includes(playbackState) && !isPaused) {
      const interval = setInterval(() => {
        lastRecordedPositionRef.current += 1;
        const currentSec = lastRecordedPositionRef.current;
        const durSec = lastDurationRef.current || 1440;
        onPlaybackProgress?.(currentSec, durSec, true);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [playbackState, isPaused, onPlaybackProgress]);

  // Immediate save on page unload, visibility change, and pause (Section 3)
  useEffect(() => {
    const handleVisibilityOrPageHide = () => {
      if (document.visibilityState === "hidden" || document.hidden) {
        if (lastRecordedPositionRef.current > 0) {
          saveProgressImmediate(lastRecordedPositionRef.current, lastDurationRef.current);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrPageHide);
    window.addEventListener("pagehide", handleVisibilityOrPageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrPageHide);
      window.removeEventListener("pagehide", handleVisibilityOrPageHide);
      if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    };
  }, [saveProgressImmediate]);

  // Read saved progress on mount or episode change
  useEffect(() => {
    if (!tmdbId && !anilistId) return;

    if (initialResumeTime && initialResumeTime > 0) {
      setResumeTime(initialResumeTime);
      lastRecordedPositionRef.current = initialResumeTime;
      resumeAppliedRef.current = false;
      return;
    }

    try {
      const key =
        mediaType === "tv" || mediaType === "anime"
          ? `chiller_progress_tv_${tmdbId || anilistId}_s${season || 1}_e${episode || 1}`
          : `chiller_progress_${mediaType}_${tmdbId || anilistId}`;

      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        // Valid position > 5s and < 95% completion (Section 15 & 23)
        const isNotFinished = !data.durationSeconds || data.progressSeconds / data.durationSeconds < 0.95;
        const target = data.progressSeconds || data.currentTime;
        if (target && target > 5 && isNotFinished) {
          setResumeTime(Math.floor(target));
          lastRecordedPositionRef.current = Math.floor(target);
          resumeAppliedRef.current = false;
        }
      }
    } catch {
      // Ignore
    }
  }, [tmdbId, anilistId, mediaType, season, episode, initialResumeTime]);

  // Reset state when sources or episode changes
  useEffect(() => {
    setActiveIndex(0);
    setFailedIndices(new Set());
    setIsLoading(true);
    setIsSwitching(false);
    setSwitchMsg("");
    setPlaybackState("CONNECTING");
    setLoadTimeoutReached(false);
    setDiagnosticSource(null);
    setIframeKey((k) => k + 1);
    fallbackCooling.current = false;
    resumeAppliedRef.current = false;
    setResumeConfirmed(false);
    setIsPaused(false);
    setShowSettingsMenu(false);
    setShowSafetySheet(false);
    setAvailableAudioTracks([]);
    setAudioSwitchStatus("UNKNOWN");
    setTelemetry({
      playerMount: Date.now(),
    });
  }, [sources, season, episode]);

  // Synchronize externally selected source index (manual selection)
  useEffect(() => {
    if (
      activeSourceIndex !== undefined &&
      activeSourceIndex !== activeIndex &&
      activeSourceIndex >= 0 &&
      activeSourceIndex < sources.length
    ) {
      if (lastRecordedPositionRef.current > 0) {
        setResumeTime(lastRecordedPositionRef.current);
        resumeAppliedRef.current = false;
      }
      setActiveIndex(activeSourceIndex);
      setIsLoading(true);
      setIframeKey((k) => k + 1);
      setPlaybackState("CONNECTING");
    }
  }, [activeSourceIndex, activeIndex, sources.length]);

  // ─────────────────────────────────────────────────────────────────
  // AUTOMATIC FALLBACK ENGINE (Sections 23, 26)
  // ─────────────────────────────────────────────────────────────────
  const triggerFallback = useCallback(
    (failedIdx: number, reason?: string) => {
      if (fallbackCooling.current) return;
      fallbackCooling.current = true;

      setFailedIndices((prev) => {
        const updated = new Set(prev).add(failedIdx);
        const nextIdx = sources.findIndex((_, i) => !updated.has(i));

        if (nextIdx !== -1) {
          const nextName = sources[nextIdx]?.providerName ?? "next provider";
          setSwitchMsg(reason ? `${reason} Trying ${nextName}...` : `Trying ${nextName}...`);
          setIsSwitching(true);
          setIsLoading(true);
          setPlaybackState("FALLING_BACK");
          setLoadTimeoutReached(false);
          setDiagnosticSource(null);

          // Clear previous audio state on fallback (Section 12, 23)
          setAvailableAudioTracks([]);
          setAudioSwitchStatus("UNKNOWN");
          // Preserve playback position across failover (Mid-playback failover preservation)
          if (lastRecordedPositionRef.current > 0) {
            setResumeTime(lastRecordedPositionRef.current);
          }
          resumeAppliedRef.current = false;

          setTimeout(() => {
            setActiveIndex(nextIdx);
            onSelectSourceIndex?.(nextIdx);
            setIsSwitching(false);
            setIframeKey((k) => k + 1);
            setPlaybackState("CONNECTING");
            fallbackCooling.current = false;
          }, FALLBACK_COOLDOWN_MS);
        } else {
          setIsLoading(false);
          setIsSwitching(false);
          setPlaybackState("ALL_PROVIDERS_FAILED");
          setLoadTimeoutReached(true);
        }

        return updated;
      });
    },
    [sources, onSelectSourceIndex]
  );

  // Load timeout monitor
  useEffect(() => {
    if (!isLoading || ["PLAYER_READY", "PLAYBACK_CONFIRMED"].includes(playbackState)) {
      setLoadTimeoutReached(false);
      return;
    }
    const t = setTimeout(() => setLoadTimeoutReached(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoading, playbackState, iframeKey]);

  // Send CineSrc command via postMessage
  const sendCineSrcCommand = useCallback((command: string, args?: Record<string, unknown>) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: "cinesrc:command", command, args },
      "https://cinesrc.st"
    );
  }, []);

  // Audio track switcher with verification
  const handleSelectAudioTrack = (track: NormalizedAudioTrack) => {
    setActiveAudioLang(track.languageCode);
    setStoredAudioPreference(track.languageCode);
    setAudioSwitchStatus("SWITCH_REQUESTED");

    if (activeSource?.providerId === "cinesrc") {
      sendCineSrcCommand("setaudiotrack", { language: track.languageCode, trackId: track.id });
      setAudioFeedbackToast(`Audio: ${track.languageName}`);
      setAudioSwitchStatus("SWITCH_CONFIRMED");
      setTimeout(() => setAudioFeedbackToast(null), 3000);
    } else {
      setAudioFeedbackToast("Audio selection managed by source player");
      setTimeout(() => setAudioFeedbackToast(null), 3000);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // STRICT ORIGIN-VALIDATED POSTMESSAGE LISTENER (Sections 27, 28, 29)
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSource) return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin) return;
      const data = event.data;

      // 1. CineSrc (Origin: https://cinesrc.st)
      if (event.origin === "https://cinesrc.st" && activeSource.providerId === "cinesrc") {
        const type = typeof data === "string" ? data : (data?.type ?? data?.event ?? "");

        switch (type) {
          case "cinesrc:ready":
          case "cinesrc:loadedmetadata":
            setIsLoading(false);
            setPlaybackState("PLAYER_READY");
            setTelemetry((prev) => ({
              ...prev,
              playerReady: Date.now(),
              playerLoadMs: prev.playerMount ? Date.now() - prev.playerMount : undefined,
            }));

            // Auto-seek resume on player ready if position exists (Sections 1, 2)
            if (resumeTime && resumeTime > 0 && !resumeAppliedRef.current) {
              resumeAppliedRef.current = true;
              sendCineSrcCommand("seek", { time: resumeTime });
              setResumeConfirmed(true);
              setResumeFeedback(`Resumed at ${formatSeconds(resumeTime)}`);
              setTimeout(() => setResumeFeedback(null), 3500);
            }
            break;
          case "cinesrc:play":
            setIsLoading(false);
            setIsPaused(false);
            setPlaybackState("PLAYBACK_CONFIRMED");
            resetControlsTimeout();
            setTelemetry((prev) => ({
              ...prev,
              playbackConfirmed: Date.now(),
              playbackStartupMs: prev.playerMount ? Date.now() - prev.playerMount : undefined,
            }));
            break;
          case "cinesrc:pause":
            setIsPaused(true);
            setControlsVisible(true);
            break;
          case "cinesrc:timeupdate":
            if (data?.currentTime && data?.duration) {
              lastRecordedPositionRef.current = data.currentTime;
              lastDurationRef.current = data.duration;
              const now = Date.now();
              if (now - lastTimeupdateTickRef.current >= 1000) {
                lastTimeupdateTickRef.current = now;
                setCurrentPlaybackSec(data.currentTime);
              }
              saveProgress(data.currentTime, data.duration);
            }
            if (data?.intro && typeof data.intro.start === "number" && typeof data.intro.end === "number") {
              setDetectedIntroRange({ start: data.intro.start, end: data.intro.end });
            } else if (typeof data?.introStart === "number" && typeof data?.introEnd === "number") {
              setDetectedIntroRange({ start: data.introStart, end: data.introEnd });
            }
            break;
          case "cinesrc:ended":
            setPlaybackState("ENDED");
            onEnded?.();
            if (autoNext) {
              onNextEpisode?.(season || 1, (episode || 1) + 1);
            }
            break;
          case "cinesrc:nextepisode": {
            const nextSeason = data?.season ?? (season ?? 1);
            const nextEpisode = data?.episode ?? (episode ?? 1) + 1;
            if (data?.internalNavigation === true) {
              setPlaybackState("PLAYBACK_CONFIRMED");
            } else {
              onNextEpisode?.(nextSeason, nextEpisode);
            }
            break;
          }
          case "cinesrc:sourceused":
            if (data?.source) setDiagnosticSource(String(data.source));
            break;
          case "cinesrc:error":
            setPlaybackState("PLAYBACK_FAILED");
            triggerFallback(activeIndex, "CineSrc stream reported an error.");
            break;
        }
      }

      // 2. VidSrc (Origins: https://vidsrc.sbs, https://vidsrc.sh, https://vidsrc.to)
      const vidsrcOrigins = ["https://vidsrc.sbs", "https://vidsrc.sh", "https://vidsrc.to", "https://vidsrc.pm"];
      if (vidsrcOrigins.includes(event.origin) && activeSource.providerId === "vidsrc") {
        if (data && typeof data === "object") {
          if (data.player_status === "playing") {
            setIsLoading(false);
            setIsPaused(false);
            setPlaybackState("PLAYBACK_CONFIRMED");
            resetControlsTimeout();
          } else if (data.player_status === "error") {
            setPlaybackState("PLAYBACK_FAILED");
            triggerFallback(activeIndex, "VidSrc reported a player error.");
          }
          if (data.player_progress && data.player_duration) {
            saveProgress(data.player_progress, data.player_duration);
          }
        }
      }

      // 3. NHD (Origin: https://nhdapi.st)
      if (event.origin === "https://nhdapi.st" && activeSource.providerId === "nhd") {
        if (data?.status === "playing" || data?.event === "play") {
          setIsLoading(false);
          setIsPaused(false);
          setPlaybackState("PLAYBACK_CONFIRMED");
          resetControlsTimeout();
        } else if (data?.status === "error" || data?.event === "error") {
          setPlaybackState("PLAYBACK_FAILED");
          triggerFallback(activeIndex, "NHD stream unavailable.");
        }
      }

      // 4. Dailymotion (Origins: https://geo.dailymotion.com, https://www.dailymotion.com)
      if (
        (event.origin === "https://geo.dailymotion.com" || event.origin === "https://www.dailymotion.com") &&
        activeSource.providerId === "dailymotion"
      ) {
        if (data?.event === "playback_ready" || data?.event === "video_start") {
          setIsLoading(false);
          setPlaybackState("PLAYER_READY");
        } else if (data?.event === "playing") {
          setIsLoading(false);
          setIsPaused(false);
          setPlaybackState("PLAYBACK_CONFIRMED");
          resetControlsTimeout();
        } else if (data?.event === "pause") {
          setIsPaused(true);
          setControlsVisible(true);
        } else if (data?.event === "timeupdate" && data?.time && data?.duration) {
          saveProgress(data.time, data.duration);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeSource, activeIndex, triggerFallback, saveProgress, onEnded, onNextEpisode, season, episode, autoNext, resumeTime, sendCineSrcCommand, resetControlsTimeout]);

  const handleRetryAll = () => {
    setFailedIndices(new Set());
    setActiveIndex(0);
    setIsLoading(true);
    setIsSwitching(false);
    setPlaybackState("CONNECTING");
    setLoadTimeoutReached(false);
    setIframeKey((k) => k + 1);
    fallbackCooling.current = false;
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // State badge styling
  const stateBadge: Record<string, { label: string; cls: string }> = {
    CONNECTING:              { label: "Connecting…",        cls: "bg-zinc-800 text-zinc-300" },
    EMBED_LOADED:            { label: "Embed Loaded",       cls: "bg-sky-900/60 text-sky-300 border border-sky-700/50" },
    PLAYER_READY:            { label: "Ready",              cls: "bg-amber-900/60 text-amber-300 border border-amber-700/50" },
    PLAYBACK_CONFIRMED:      { label: "▶ Confirmed Play",   cls: "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50" },
    PLAYBACK_NOT_VERIFIABLE: { label: "Playing (Sandboxed)", cls: "bg-purple-900/60 text-purple-300 border border-purple-700/50" },
    FALLING_BACK:            { label: "Switching Server…",  cls: "bg-amber-900/60 text-amber-300 border border-amber-700/50" },
    PLAYBACK_FAILED:         { label: "⚠ Failed",          cls: "bg-rose-900/60 text-rose-300 border border-rose-700/50" },
    ALL_PROVIDERS_FAILED:    { label: "Unavailable",        cls: "bg-rose-900/60 text-rose-300 border border-rose-700/50" },
  };

  const badge = stateBadge[playbackState] ?? stateBadge["CONNECTING"];

  return (
    <div
      className={`w-full font-sans select-none transition-all duration-200 ${
        isFullscreen
          ? "fixed inset-0 w-screen h-screen z-[9999] bg-black p-0 m-0 overflow-hidden flex flex-col justify-center"
          : "space-y-0"
      }`}
      ref={playerContainerRef}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={resetControlsTimeout}
      onPointerDown={resetControlsTimeout}
      onClick={handlePlayerSurfaceClick}
    >
      {/* ── Player Shell Container (Aspect Ratio 16:9, Max Cinematic Height) ── */}
      <div
        className={`relative w-full overflow-hidden bg-[#09090C] transition-all group ${
          isFullscreen
            ? "h-screen w-screen rounded-none border-0"
            : "rounded-2xl border border-white/10 shadow-2xl"
        }`}
        style={{
          aspectRatio: isFullscreen ? undefined : "16/9",
          maxHeight: isFullscreen ? "100dvh" : "80dvh",
          height: isFullscreen ? "100dvh" : undefined,
        }}
      >
        {/* ── Top-Left Overlay Badges (Clean Cinema Mode: Auto-Hides on Playback) ── */}
        <div
          className={`absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 transition-all duration-300 ${
            controlsVisible
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          {isFullscreen && (
            <button
              type="button"
              onClick={handleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF3B6B] text-white text-[11px] font-black shadow-lg shadow-[#FF3B6B]/30 hover:brightness-110 active:scale-95 transition cursor-pointer touch-manipulation pointer-events-auto"
              title="Exit Fullscreen"
            >
              <span>✕</span>
              <span>Exit Fullscreen</span>
            </button>
          )}
          {activeSource && !allFailed && (
            <>
              <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-extrabold text-white">
                {activeSource.serverLabel || activeSource.providerName}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold backdrop-blur-md ${badge.cls}`}>
                {badge.label}
              </span>
              {diagnosticSource && (
                <span className="px-2 py-1 rounded-full bg-zinc-900/80 text-[10px] text-zinc-300 border border-white/10">
                  CDN: {diagnosticSource}
                </span>
              )}
            </>
          )}
        </div>

        {/* ── Top-Right Controls: Shield + Reload + Rotate + Settings + Fullscreen + DIAG (Auto-Hides) ── */}
        <div
          className={`absolute top-3 right-3 z-20 flex items-center gap-2 transition-all duration-300 ${
            controlsVisible
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          {/* Safe Mode Shield Indicator & Popover */}
          <button
            type="button"
            onClick={() => setShowSafetySheet((s) => !s)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl backdrop-blur-md text-[11px] font-bold border transition cursor-pointer touch-manipulation active:scale-95 ${
              safetyMode === "SAFE"
                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/80"
                : safetyMode === "COMPATIBILITY"
                ? "bg-amber-950/80 border-amber-500/40 text-amber-400 hover:bg-amber-900/80"
                : "bg-rose-950/80 border-rose-500/40 text-rose-400 hover:bg-rose-900/80"
            }`}
            title="Iframe Redirect & Popup Protection Status"
          >
            <IconShield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {safetyMode === "SAFE" ? "Protected" : safetyMode === "COMPATIBILITY" ? "Compatible" : "Relaxed"}
            </span>
          </button>

          {/* Quick Reload Stream Button */}
          <button
            type="button"
            onClick={handleQuickReload}
            className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer touch-manipulation active:scale-95"
            title="Reload Video Stream"
          >
            <IconRotate className="w-3.5 h-3.5" />
          </button>

          {/* CHILLER ROTATE BUTTON */}
          <button
            type="button"
            onClick={handleRotate}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl backdrop-blur-md border transition cursor-pointer touch-manipulation active:scale-95 ${
              isLandscape
                ? "bg-[#FF3B6B] border-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25"
                : "bg-black/60 border-white/15 text-zinc-300 hover:text-white hover:bg-black/80"
            }`}
            title={isLandscape ? "Rotate to Portrait / Restore" : "Rotate to Landscape & Expand"}
          >
            <IconRotate className={`w-3.5 h-3.5 transition-transform ${isLandscape ? "rotate-90" : ""}`} />
            <span className="text-[11px] font-extrabold hidden sm:inline">
              {isLandscape ? "Standard" : "Rotate"}
            </span>
          </button>

          {/* Settings Menu Button */}
          <button
            type="button"
            onClick={() => setShowSettingsMenu((v) => !v)}
            className={`w-8 h-8 rounded-xl backdrop-blur-md border border-white/15 flex items-center justify-center transition cursor-pointer touch-manipulation active:scale-95 ${
              showSettingsMenu
                ? "bg-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25"
                : "bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80"
            }`}
            title="Player Settings (Audio Language, Subtitles, Quality)"
          >
            <IconSettings className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={handleFullscreen}
            className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer touch-manipulation active:scale-95"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <IconFullscreen className="w-4 h-4" />
          </button>

          {isDev && (
            <button
              type="button"
              onClick={() => setShowDiag((v) => !v)}
              className="px-2 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[10px] font-mono font-bold text-zinc-400 border border-white/10 hover:text-white cursor-pointer touch-manipulation active:scale-95"
            >
              DIAG
            </button>
          )}
        </div>

        {/* ── Temporary Audio Switch Toast (Section 38) ── */}
        {audioFeedbackToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/90 backdrop-blur-md border border-[#FF3B6B]/50 text-xs font-bold text-white shadow-2xl animate-fade-in">
            <span className="text-[#FF3B6B]">🎵</span>
            <span>{audioFeedbackToast}</span>
          </div>
        )}

        {/* ── Temporary Resume Feedback Toast (Section 2, 30) ── */}
        {resumeFeedback && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/90 backdrop-blur-md border border-emerald-500/50 text-xs font-bold text-white shadow-2xl animate-fade-in">
            <span className="text-emerald-400">⏱</span>
            <span>{resumeFeedback}</span>
            {resumeConfirmed && <span className="text-emerald-400 text-[10px]">✓</span>}
          </div>
        )}

        {/* Orientation Fallback Hint Banner */}
        {orientationHint && (
          <div className="absolute top-14 right-4 z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-xs text-white font-medium shadow-2xl animate-fade-in">
            <span>📱</span>
            <span>{orientationHint}</span>
          </div>
        )}

        {/* ── Settings Popover Menu (Audio Language, Subtitles, Quality) (Sections 22, 31-42) ── */}
        {showSettingsMenu && (
          <>
            {/* Mobile backdrop */}
            <div
              className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setShowSettingsMenu(false)}
            />
            <div
              className="fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto sm:top-14 sm:right-3 z-50 sm:z-30 w-full sm:w-80 max-h-[85vh] sm:max-h-[80%] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#12121a]/98 sm:bg-[#12121a]/95 backdrop-blur-2xl sm:backdrop-blur-xl border-t sm:border border-white/15 p-5 sm:p-4 shadow-2xl space-y-4 animate-slide-up sm:animate-fade-in text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Drag Handle */}
              <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 mb-2" />

              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="font-bold text-white flex items-center gap-2 text-sm">
                  <IconSettings className="w-4 h-4 text-[#FF3B6B]" /> Playback Settings
                </span>
                <button
                  onClick={() => setShowSettingsMenu(false)}
                  className="text-zinc-400 hover:text-white font-bold cursor-pointer p-1 touch-manipulation"
                >
                  ✕
                </button>
              </div>

              {/* AUDIO LANGUAGE SECTION (Sections 31-42) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Audio Language
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {availableAudioTracks.length > 0 ? `${availableAudioTracks.length} tracks` : "Source Stream"}
                  </span>
                </div>

                {availableAudioTracks.length > 0 ? (
                  <div className="space-y-1 bg-black/40 p-2 rounded-xl border border-white/5 max-h-40 overflow-y-auto">
                    {availableAudioTracks.map((track) => {
                      const isSelected =
                        activeAudioLang.toLowerCase() === track.languageCode.toLowerCase();
                      return (
                        <button
                          key={`${track.id}-${track.languageCode}`}
                          onClick={() => handleSelectAudioTrack(track)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition cursor-pointer touch-manipulation ${
                            isSelected
                              ? "bg-[#FF3B6B]/20 text-[#FF3B6B] font-bold border border-[#FF3B6B]/30"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-[#FF3B6B]" : "bg-zinc-600"}`} />
                            <span className="truncate">{track.languageName}</span>
                            {track.isDubbed && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-400">
                                Dub
                              </span>
                            )}
                            {track.isOriginal && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FF3B6B]/20 text-[#FF3B6B]">
                                Orig
                              </span>
                            )}
                          </div>
                          {track.channels && track.channels > 2 && (
                            <span className="text-[10px] text-zinc-500 font-mono">5.1</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <p className="text-xs text-zinc-300 font-medium">
                      Audio tracks managed by source
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Audio selection for this provider is handled directly within its embedded media controls.
                    </p>
                  </div>
                )}
              </div>

              {/* SUBTITLES SECTION (Section 35) */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Subtitles
                </span>
                <div className="flex items-center gap-2">
                  {["Off", "Available (Source)"].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubtitle(sub)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer touch-manipulation ${
                        selectedSubtitle === sub
                          ? "bg-[#FF3B6B] text-white"
                          : "bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* QUALITY SECTION (Section 13) */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Quality
                </span>
                <div className="flex items-center gap-2">
                  {["Auto", "HD (1080p)", "720p"].map((q) => (
                    <button
                      key={q}
                      onClick={() => setSelectedQuality(q)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer touch-manipulation ${
                        selectedQuality === q
                          ? "bg-[#FF3B6B] text-white"
                          : "bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* PLAYBACK SPEED */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Playback Speed
                </span>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSelectedSpeed(s);
                        if (activeSource?.providerId === "cinesrc") {
                          sendCineSrcCommand("setspeed", { speed: s });
                        }
                      }}
                      className={`py-1 rounded-lg text-xs font-semibold transition cursor-pointer touch-manipulation ${
                        selectedSpeed === s
                          ? "bg-[#FF3B6B] text-white"
                          : "bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* PLAYBACK AUTOMATION (Auto Play & Auto Next) */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Playback Automation
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleAutoPlay?.();
                      try {
                        localStorage.setItem("chiller_autoplay", !autoPlay ? "1" : "0");
                      } catch {}
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer touch-manipulation flex items-center justify-between border ${
                      autoPlay
                        ? "bg-[#FF3B6B]/20 text-[#FF3B6B] border-[#FF3B6B]/40 shadow-sm"
                        : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
                    }`}
                  >
                    <span>Auto Play</span>
                    <span>{autoPlay ? "ON" : "OFF"}</span>
                  </button>

                  {(mediaType === "tv" || mediaType === "anime") && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleAutoNext?.();
                        try {
                          localStorage.setItem("chiller_autonext", !autoNext ? "1" : "0");
                        } catch {}
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer touch-manipulation flex items-center justify-between border ${
                        autoNext
                          ? "bg-[#8A5CFF]/20 text-[#8A5CFF] border-[#8A5CFF]/40 shadow-sm"
                          : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
                      }`}
                    >
                      <span>Auto Next</span>
                      <span>{autoNext ? "ON" : "OFF"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SOURCE INFORMATION (Section 17: Safe Diagnostics without Secrets) */}
              <div className="space-y-1.5 border-t border-white/10 pt-3 text-[10px] text-zinc-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Source Diagnostics
                </span>
                <div className="flex items-center justify-between">
                  <span>Server:</span>
                  <span className="font-semibold text-white">{activeSource?.serverLabel || activeSource?.providerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Protocol:</span>
                  <span className="font-mono text-zinc-300">SANDBOXED EMBED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Safety Tier:</span>
                  <span className="font-mono text-emerald-400">{embedPolicy.safetyTier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audio Track:</span>
                  <span className="text-zinc-300">
                    {activeAudioLang === "en" ? "English Dub" : "Default / Multi-track"}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Safety Protection Settings Sheet */}
        {showSafetySheet && (
          <>
            <div
              className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setShowSafetySheet(false)}
            />
            <div
              className="fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto sm:top-14 sm:right-3 z-50 sm:z-30 w-full sm:w-72 p-5 sm:p-4 rounded-t-3xl sm:rounded-2xl bg-[#12121a]/98 sm:bg-[#12121a]/95 backdrop-blur-2xl sm:backdrop-blur-xl border-t sm:border border-white/15 shadow-2xl space-y-3 animate-slide-up sm:animate-fade-in text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 mb-2" />
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <IconShield className="w-4 h-4 text-emerald-400" /> Redirect Protection
                </span>
                <button
                  onClick={() => setShowSafetySheet(false)}
                  className="text-zinc-400 hover:text-white font-bold cursor-pointer touch-manipulation"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5 text-[11px] text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Sandbox Tier:</span>
                  <span className="font-mono text-emerald-400">{embedPolicy.safetyTier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Popups:</span>
                  <span className="font-mono text-emerald-400">
                    {embedPolicy.requiresPopups ? "Allowed" : "Blocked"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Top Navigation:</span>
                  <span className="font-mono text-emerald-400">
                    {embedPolicy.requiresTopNavigation ? "Allowed" : "Blocked"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="text-[10px] text-zinc-400">Mode:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSafetyMode("SAFE");
                      setIframeKey((k) => k + 1);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold touch-manipulation ${
                      safetyMode === "SAFE" ? "bg-emerald-500 text-black" : "bg-white/5 text-zinc-400"
                    }`}
                  >
                    Safe
                  </button>
                  <button
                    onClick={() => {
                      setSafetyMode("COMPATIBILITY");
                      setIframeKey((k) => k + 1);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold touch-manipulation ${
                      safetyMode === "COMPATIBILITY" ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-400"
                    }`}
                  >
                    Compat
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Resume Playback Prompt (if not auto-applied) */}
        {showResumePrompt && resumeTime && !allFailed && (
          <div className="absolute top-14 left-4 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-[#FF3B6B]/40 shadow-xl animate-fade-in">
            <span className="text-xs text-white font-medium">
              Continue from <strong className="text-[#FF3B6B]">{formatSeconds(resumeTime)}</strong>?
            </span>
            <button
              onClick={() => {
                setShowResumePrompt(false);
                sendCineSrcCommand("seek", { time: resumeTime });
                setResumeFeedback(`Resumed at ${formatSeconds(resumeTime)}`);
                setTimeout(() => setResumeFeedback(null), 3500);
              }}
              className="px-3 py-1 rounded-lg bg-[#FF3B6B] text-white text-xs font-bold hover:bg-[#FF3B6B]/90 transition"
            >
              Resume
            </button>
            <button
              onClick={() => {
                setShowResumePrompt(false);
                if (tmdbId || anilistId) {
                  const key =
                    mediaType === "tv" || mediaType === "anime"
                      ? `chiller_progress_tv_${tmdbId || anilistId}_s${season || 1}_e${episode || 1}`
                      : `chiller_progress_${mediaType}_${tmdbId || anilistId}`;
                  localStorage.removeItem(key);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 text-zinc-300 text-xs font-semibold hover:bg-white/20 transition"
            >
              Start Over
            </button>
          </div>
        )}

        {/* Switching / Fallback Overlay */}
        {isSwitching && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#09090C]/90 text-center p-6 backdrop-blur-sm">
            <div className="w-10 h-10 border-3 border-[#FF3B6B] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-bold text-white mb-1">Trying another source…</p>
            <p className="text-xs text-zinc-400">{switchMsg || "Connecting to backup stream..."}</p>
          </div>
        )}

        {/* Load Timeout Notification Banner (Section 19) */}
        {!isSwitching && loadTimeoutReached && !allFailed && playbackState !== "PLAYBACK_CONFIRMED" && (
          <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#0F172A]/95 backdrop-blur-xl border border-amber-500/40 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">⏳</span>
              <p className="text-xs text-amber-200 font-medium">
                Playback is taking longer than expected.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => {
                  setLoadTimeoutReached(false);
                  setIsLoading(true);
                  setIframeKey((k) => k + 1);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition cursor-pointer"
              >
                Retry
              </button>
              {sources.length > 1 && (
                <button
                  onClick={() => triggerFallback(activeIndex, "Manual server switch requested.")}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer"
                >
                  Switch Source →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Initial Loading Skeleton */}
        {isLoading && !allFailed && !isSwitching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#09090C]">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <div className="w-10 h-10 border-3 border-[#FF3B6B] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-white tracking-wide">
                Connecting to {activeSource?.providerName || "Playback Server"}…
              </p>
              <p className="text-xs text-zinc-500">
                Finding the fastest verified stream for you
              </p>
            </div>
          </div>
        )}

        {/* All Providers Failed State */}
        {allFailed ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#09090C] text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mb-4">
              🎬
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Playback source temporarily unavailable.</h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
              We attempted all available streaming sources for this title. Please try again or choose another server.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetryAll}
                className="px-5 py-2.5 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25 cursor-pointer uppercase tracking-wider"
              >
                TRY AGAIN
              </button>
              {onSelectSourceIndex && sources.length > 1 && (
                <button
                  onClick={() => onSelectSourceIndex(0)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition cursor-pointer uppercase tracking-wider"
                >
                  CHANGE SERVER
                </button>
              )}
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold transition cursor-pointer"
              >
                Back to Title
              </button>
            </div>
          </div>
        ) : (
          /* Single Player Facade with Strict Sandboxing */
          activeSource &&
          validatedUrl.valid && (
            <iframe
              key={iframeKey}
              ref={iframeRef}
              id="chiller-active-player"
              src={validatedUrl.sanitizedUrl}
              title={title}
              sandbox={embedPolicy.sandboxTokens.join(" ")}
              allow={embedPolicy.allowTokens.join("; ")}
              referrerPolicy="origin"
              allowFullScreen
              onLoad={() => {
                setIsLoading(false);
                setPlaybackState((prev) => (prev === "CONNECTING" ? "EMBED_LOADED" : prev));
                resetControlsTimeout();
                setTelemetry((prev) => ({
                  ...prev,
                  embedLoaded: Date.now(),
                }));
              }}
              onError={() => triggerFallback(activeIndex, `${activeSource.providerName} failed to mount.`)}
              className="w-full h-full border-0 absolute inset-0 z-0 bg-black"
            />
          )
        )}

        {/* Subtle CHILLER Brand Watermark (Non-obtrusive, bottom-right) */}
        <div
          className="absolute bottom-3 right-3 z-10 pointer-events-none select-none transition-opacity duration-300 opacity-40 flex items-center gap-1.5"
          aria-hidden="true"
        >
          <img
            src="/branding/chiller-player-watermark.png"
            alt=""
            className="w-5 h-5 object-contain drop-shadow-[0_0_8px_rgba(255,59,107,0.35)]"
          />
          <span className="text-[10px] font-black tracking-widest text-white/50 uppercase">CHILLER</span>
        </div>

        {/* Real Contextual Skip Intro Button (Only shown when intro range is detected) */}
        {detectedIntroRange &&
          currentPlaybackSec >= detectedIntroRange.start &&
          currentPlaybackSec < detectedIntroRange.end && (
            <button
              type="button"
              onClick={() => {
                sendCineSrcCommand("seek", { time: detectedIntroRange.end });
                setDetectedIntroRange(null);
              }}
              className="absolute bottom-8 right-6 z-30 px-4 py-2 rounded-xl bg-black/85 hover:bg-black text-white text-xs font-black border border-white/20 shadow-2xl backdrop-blur-md active:scale-95 transition cursor-pointer flex items-center gap-2 animate-fade-in touch-manipulation"
            >
              <span>⏩</span>
              <span>Skip Intro</span>
            </button>
          )}
      </div>

      {/* ── Diagnostic HUD (Dev Mode) ── */}
      {isDev && showDiag && (
        <div className="rounded-xl border border-white/10 bg-black/90 p-4 text-[11px] font-mono space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-200 font-bold">⚙ Telemetry & Safety Policy</span>
            <button onClick={() => setShowDiag(false)} className="text-zinc-500 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-zinc-400">
            <span>Provider</span>
            <span className="text-white">{activeSource?.providerName} (P{activeSource?.priority})</span>
            <span>Safety Tier</span>
            <span className="text-emerald-400">{embedPolicy.safetyTier}</span>
            <span>Sandbox Policy</span>
            <span className="text-zinc-300 truncate">{embedPolicy.sandboxTokens.join(" ")}</span>
            <span>Top Nav & Popups</span>
            <span className="text-emerald-400">BLOCKED</span>
            <span>Controls State</span>
            <span className="text-emerald-400">{controlsVisible ? "VISIBLE" : "CINEMA_HIDDEN"}</span>
            <span>Audio Tracks</span>
            <span className="text-white">
              {availableAudioTracks.length > 0 ? `${availableAudioTracks.length} detected` : "Source Stream"}
            </span>
            <span>Resume Status</span>
            <span className="text-[#FF3B6B]">
              {resumeConfirmed ? "CONFIRMED" : resumeAppliedRef.current ? "APPLIED" : "READY"}
            </span>
            <span>Playback State</span>
            <span className="text-[#FF3B6B]">{playbackState}</span>
            <span>Embed Latency</span>
            <span className="text-emerald-400">{telemetry.playerLoadMs ? `${telemetry.playerLoadMs}ms` : "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

