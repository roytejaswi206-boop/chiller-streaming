"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { IconFullscreen, IconRotate, IconShield } from "@/components/icons";
import { PlaybackCandidate, ContentPlaybackStatus, PlaybackTelemetry } from "@/lib/playback/types";
import { getProviderEmbedPolicy, validateProviderUrl, SafetyTier } from "@/lib/playback/embed-policy";

interface ExternalPlayerProps {
  sources: PlaybackCandidate[];
  title: string;
  posterUrl?: string;
  mediaType?: "movie" | "tv" | "anime";
  tmdbId?: number;
  anilistId?: number;
  season?: number;
  episode?: number;
  onEnded?: () => void;
  onNextEpisode?: (nextSeason: number, nextEpisode: number) => void;
  onPrevEpisode?: () => void;
  hasPrevEpisode?: boolean;
  hasNextEpisode?: boolean;
  autoPlay?: boolean;
  autoNext?: boolean;
  onToggleAutoPlay?: () => void;
  onToggleAutoNext?: () => void;
  onSelectSourceIndex?: (index: number) => void;
}

// Fallback retry delay (ms)
const FALLBACK_COOLDOWN_MS = 600;
// Maximum load timeout before auto-offering fallback (ms)
const LOAD_TIMEOUT_MS = 10000;
// Debounce for progress saves (ms)
const PROGRESS_DEBOUNCE_MS = 6000;

export function ExternalPlayer({
  sources = [],
  title,
  posterUrl,
  mediaType = "movie",
  tmdbId,
  anilistId,
  season,
  episode,
  onEnded,
  onNextEpisode,
  onPrevEpisode,
  hasPrevEpisode,
  hasNextEpisode,
  autoPlay = true,
  autoNext = true,
  onToggleAutoPlay,
  onToggleAutoNext,
  onSelectSourceIndex,
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

  // Safety & Redirect Protection State
  const [safetyMode, setSafetyMode] = useState<"SAFE" | "COMPATIBILITY" | "RELAXED">("SAFE");
  const [interactionUnlocked, setInteractionUnlocked] = useState(true);
  const [showSafetySheet, setShowSafetySheet] = useState(false);

  // Orientation & Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [orientationHint, setOrientationHint] = useState<string | null>(null);

  // Resume prompt state
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

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

  // Check for saved watch progress on episode mount
  useEffect(() => {
    if (!tmdbId && !anilistId) return;
    try {
      const key =
        mediaType === "tv" || mediaType === "anime"
          ? `chiller_progress_tv_${tmdbId || anilistId}_s${season || 1}_e${episode || 1}`
          : `chiller_progress_${mediaType}_${tmdbId || anilistId}`;

      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.currentTime && data.duration && data.currentTime > 60 && data.currentTime / data.duration < 0.9) {
          setResumeTime(Math.floor(data.currentTime));
          setShowResumePrompt(true);
        }
      }
    } catch {
      // Ignore
    }
  }, [tmdbId, anilistId, mediaType, season, episode]);

  // Reset when sources or episode changes
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
    setTelemetry({
      playerMount: Date.now(),
    });
  }, [sources, season, episode]);

  // ─────────────────────────────────────────────────────────────────
  // FULLSCREEN & ORIENTATION SYNC (Sections 9, 19, 20, 21, 22, 46, 47)
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);

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
  }, []);

  const handleFullscreen = async () => {
    const container = playerContainerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch {
      // Non-blocking fallback
    }
  };

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
  const saveProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (!tmdbId && !anilistId) return;
      if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);

      progressSaveTimer.current = setTimeout(() => {
        try {
          const key =
            mediaType === "tv" || mediaType === "anime"
              ? `chiller_progress_tv_${tmdbId || anilistId}_s${season || 1}_e${episode || 1}`
              : `chiller_progress_${mediaType}_${tmdbId || anilistId}`;

          localStorage.setItem(
            key,
            JSON.stringify({
              currentTime,
              duration,
              season,
              episode,
              providerId: activeSource?.providerId,
              savedAt: new Date().toISOString(),
            })
          );
        } catch {
          // Ignore
        }
      }, PROGRESS_DEBOUNCE_MS);
    },
    [tmdbId, anilistId, mediaType, season, episode, activeSource]
  );

  useEffect(() => {
    return () => {
      if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // AUTOMATIC FALLBACK ENGINE
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
          fallbackCooling.current = false;
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
            setIsLoading(false);
            setPlaybackState("PLAYER_READY");
            setTelemetry((prev) => ({
              ...prev,
              playerReady: Date.now(),
              playerLoadMs: prev.playerMount ? Date.now() - prev.playerMount : undefined,
            }));
            break;
          case "cinesrc:loadedmetadata":
            setIsLoading(false);
            setPlaybackState("PLAYER_READY");
            break;
          case "cinesrc:play":
            setIsLoading(false);
            setPlaybackState("PLAYBACK_CONFIRMED");
            setTelemetry((prev) => ({
              ...prev,
              playbackConfirmed: Date.now(),
              playbackStartupMs: prev.playerMount ? Date.now() - prev.playerMount : undefined,
            }));
            break;
          case "cinesrc:timeupdate":
            if (data?.currentTime && data?.duration) {
              saveProgress(data.currentTime, data.duration);
            }
            break;
          case "cinesrc:ended":
            setPlaybackState("ENDED");
            onEnded?.();
            if (autoNext) {
              onNextEpisode?.((season || 1), (episode || 1) + 1);
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
            setPlaybackState("PLAYBACK_CONFIRMED");
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
          setPlaybackState("PLAYBACK_CONFIRMED");
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
          setPlaybackState("PLAYBACK_CONFIRMED");
        } else if (data?.event === "timeupdate" && data?.time && data?.duration) {
          saveProgress(data.time, data.duration);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeSource, activeIndex, triggerFallback, saveProgress, onEnded, onNextEpisode, season, episode, autoNext]);

  // Send CineSrc command via postMessage
  const sendCineSrcCommand = useCallback((command: string, args?: Record<string, unknown>) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: "cinesrc:command", command, args },
      "https://cinesrc.st"
    );
  }, []);

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
      className="w-full space-y-3 font-sans select-none"
      ref={playerContainerRef}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* ── Player Shell Container (Aspect Ratio 16:9, Max Cinematic Height) ── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden bg-[#09090C] border border-white/10 shadow-2xl transition-all"
        style={{ aspectRatio: "16/9", maxHeight: isFullscreen ? "100vh" : "80vh" }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Top-Left Overlay Badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
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

        {/* Top-Right Player Controls: Safe Shield + Rotate + Fullscreen + DIAG */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {/* Safe Mode Shield Indicator & Popover */}
          <button
            onClick={() => setShowSafetySheet((s) => !s)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl backdrop-blur-md text-[11px] font-bold border transition cursor-pointer ${
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

          {/* CHILLER ROTATE BUTTON (Sections 19, 20, 21, 22) */}
          <button
            onClick={handleRotate}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl backdrop-blur-md border transition cursor-pointer ${
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

          {/* Fullscreen Button */}
          <button
            onClick={handleFullscreen}
            className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <IconFullscreen className="w-4 h-4" />
          </button>

          {isDev && (
            <button
              onClick={() => setShowDiag((v) => !v)}
              className="px-2 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[10px] font-mono font-bold text-zinc-400 border border-white/10 hover:text-white cursor-pointer"
            >
              DIAG
            </button>
          )}
        </div>

        {/* Orientation Fallback Hint Banner */}
        {orientationHint && (
          <div className="absolute top-14 right-4 z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-xs text-white font-medium shadow-2xl animate-fade-in">
            <span>📱</span>
            <span>{orientationHint}</span>
          </div>
        )}

        {/* Safety Protection Settings Sheet */}
        {showSafetySheet && (
          <div className="absolute top-14 right-3 z-30 w-72 p-4 rounded-2xl bg-[#12121a]/95 backdrop-blur-xl border border-white/15 shadow-2xl space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <IconShield className="w-4 h-4 text-emerald-400" /> Redirect Protection
              </span>
              <button
                onClick={() => setShowSafetySheet(false)}
                className="text-zinc-400 hover:text-white font-bold cursor-pointer"
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
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    safetyMode === "COMPATIBILITY" ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-400"
                  }`}
                >
                  Compat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resume Playback Prompt */}
        {showResumePrompt && resumeTime && !allFailed && (
          <div className="absolute top-14 left-4 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-[#FF3B6B]/40 shadow-xl animate-fade-in">
            <span className="text-xs text-white font-medium">
              Continue from <strong className="text-[#FF3B6B]">{formatSeconds(resumeTime)}</strong>?
            </span>
            <button
              onClick={() => {
                setShowResumePrompt(false);
                sendCineSrcCommand("seek", { time: resumeTime });
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

        {/* Load Timeout Notification Banner */}
        {!isSwitching && loadTimeoutReached && !allFailed && playbackState !== "PLAYBACK_CONFIRMED" && (
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#0F172A]/90 backdrop-blur-md border border-amber-500/30 shadow-2xl">
            <p className="text-xs text-amber-300 font-medium">
              {activeSource?.providerName} is taking longer than usual to respond.
            </p>
            <button
              onClick={() => triggerFallback(activeIndex, "Load timeout reached.")}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer"
            >
              Try Next Server →
            </button>
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

        {/* All Providers Failed State (Section 47) */}
        {allFailed ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#09090C] text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mb-4">
              🎬
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Playback isn&apos;t available right now.</h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
              We attempted all available streaming sources for this title. Please try again in a few moments or choose another title.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetryAll}
                className="px-5 py-2.5 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25 cursor-pointer"
              >
                Retry
              </button>
              {onSelectSourceIndex && sources.length > 1 && (
                <button
                  onClick={() => onSelectSourceIndex(0)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition cursor-pointer"
                >
                  More Sources
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
          /* Single Player Facade with Strict Sandboxing (Sections 3, 4, 5, 8, 14, 15) */
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
      </div>

      {/* ── Sub-Player Action Bar: Quick Toggles (AutoPlay, AutoNext, SkipIntro) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#0F172A] border border-white/[0.08]">
        {/* Playback Convenience Toggles */}
        <div className="flex items-center gap-2">
          {onToggleAutoPlay && (
            <button
              onClick={onToggleAutoPlay}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                autoPlay
                  ? "bg-[#FF3B6B]/20 border-[#FF3B6B]/40 text-[#FF3B6B]"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              Auto Play: {autoPlay ? "ON" : "OFF"}
            </button>
          )}

          {onToggleAutoNext && (mediaType === "tv" || mediaType === "anime") && (
            <button
              onClick={onToggleAutoNext}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                autoNext
                  ? "bg-[#8A5CFF]/20 border-[#8A5CFF]/40 text-[#8A5CFF]"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              Auto Next: {autoNext ? "ON" : "OFF"}
            </button>
          )}

          {activeSource?.providerId === "cinesrc" && (
            <button
              onClick={() => sendCineSrcCommand("skipintro")}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer"
            >
              Skip Intro
            </button>
          )}
        </div>

        {/* Episode Quick Steps */}
        {(mediaType === "tv" || mediaType === "anime") && (
          <div className="flex items-center gap-2">
            {hasPrevEpisode && onPrevEpisode && (
              <button
                onClick={onPrevEpisode}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer"
              >
                ← Prev Ep
              </button>
            )}
            {hasNextEpisode && onNextEpisode && (
              <button
                onClick={() => onNextEpisode((season || 1), (episode || 1) + 1)}
                className="px-3 py-1 rounded-lg bg-[#FF3B6B]/15 hover:bg-[#FF3B6B]/25 border border-[#FF3B6B]/30 text-xs font-bold text-[#FF3B6B] transition cursor-pointer"
              >
                Next Ep →
              </button>
            )}
          </div>
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
            <span>State</span>
            <span className="text-[#FF3B6B]">{playbackState}</span>
            <span>Embed Load Latency</span>
            <span className="text-emerald-400">{telemetry.playerLoadMs ? `${telemetry.playerLoadMs}ms` : "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
