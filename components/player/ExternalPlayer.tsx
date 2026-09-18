"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { IconFullscreen } from "@/components/icons";
import { PlaybackSource, ContentPlaybackStatus } from "@/lib/playback/types";

interface ExternalPlayerProps {
  sources: PlaybackSource[];
  title: string;
  posterUrl?: string;
  mediaType?: "movie" | "tv" | "anime";
  tmdbId?: number;
  anilistId?: number;
  season?: number;
  episode?: number;
  onEnded?: () => void;
  onNextEpisode?: (nextSeason: number, nextEpisode: number) => void;
}

// Cooldown between automatic fallback retries (ms)
const FALLBACK_COOLDOWN_MS = 600;
// Timeout before offering manual skip (ms)
const LOAD_TIMEOUT_MS = 14000;
// Debounce for progress saves (ms)
const PROGRESS_DEBOUNCE_MS = 5000;

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
}: ExternalPlayerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchMsg, setSwitchMsg] = useState("");
  const [iframeKey, setIframeKey] = useState(0);
  const [playbackState, setPlaybackState] = useState<ContentPlaybackStatus>("DISCOVERED");
  const [loadTimeoutReached, setLoadTimeoutReached] = useState(false);
  const [diagnosticSource, setDiagnosticSource] = useState<string | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackCooling = useRef(false);

  const activeSource = sources[activeIndex] ?? null;
  const allFailed = sources.length === 0 || failedIndices.size >= sources.length;
  const isDev = process.env.NODE_ENV === "development";

  // Reset when sources or episode changes
  useEffect(() => {
    setActiveIndex(0);
    setFailedIndices(new Set());
    setIsLoading(true);
    setIsSwitching(false);
    setSwitchMsg("");
    setPlaybackState("DISCOVERED");
    setLoadTimeoutReached(false);
    setDiagnosticSource(null);
    setIframeKey((k) => k + 1);
    fallbackCooling.current = false;
  }, [sources, season, episode]);

  // ─────────────────────────────────────────────────────────────────
  // FALLBACK ENGINE
  // Triggered by: provider error event, iframe onError, or manual click
  // ─────────────────────────────────────────────────────────────────
  const triggerFallback = useCallback(
    (failedIdx: number, reason?: string) => {
      if (fallbackCooling.current) return;
      fallbackCooling.current = true;

      setFailedIndices((prev) => {
        const updated = new Set(prev).add(failedIdx);

        // Find next un-attempted source
        const nextIdx = sources.findIndex((_, i) => !updated.has(i));
        if (nextIdx !== -1) {
          const nextName = sources[nextIdx]?.providerName ?? "next provider";
          setSwitchMsg(reason ? `${reason} Trying ${nextName}...` : `Switching to ${nextName}...`);
          setIsSwitching(true);
          setIsLoading(true);
          setPlaybackState("DISCOVERED");
          setLoadTimeoutReached(false);
          setDiagnosticSource(null);

          setTimeout(() => {
            setActiveIndex(nextIdx);
            setIsSwitching(false);
            setIframeKey((k) => k + 1);
            fallbackCooling.current = false;
          }, FALLBACK_COOLDOWN_MS);
        } else {
          setIsLoading(false);
          setIsSwitching(false);
          setPlaybackState("UNAVAILABLE");
          fallbackCooling.current = false;
        }

        return updated;
      });
    },
    [sources]
  );

  // Load timeout — offer skip if iframe hasn't signaled ready
  useEffect(() => {
    if (!isLoading || playbackState === "PLAY_STARTED") {
      setLoadTimeoutReached(false);
      return;
    }
    const t = setTimeout(() => setLoadTimeoutReached(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoading, playbackState, iframeKey]);

  // ─────────────────────────────────────────────────────────────────
  // WATCH PROGRESS PERSISTENCE (debounced, keyed by tmdbId+s+e)
  // ─────────────────────────────────────────────────────────────────
  const saveProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (!tmdbId && !anilistId) return;
      if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
      progressSaveTimer.current = setTimeout(() => {
        try {
          const key =
            mediaType === "tv"
              ? `chiller_progress_tv_${tmdbId}_s${season}_e${episode}`
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
          // Ignore localStorage quota errors
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
  // POSTMESSAGE LISTENER
  // Each provider has its own origin and event format.
  // Listen on window; filter strictly by origin.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSource) return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin) return;
      const data = event.data;

      // ── CineSrc ──────────────────────────────────────────────────
      // Origin: https://cinesrc.st
      // Documented events: cinesrc:ready, cinesrc:play, cinesrc:pause,
      //   cinesrc:timeupdate, cinesrc:seeking, cinesrc:seeked, cinesrc:ended,
      //   cinesrc:volumechange, cinesrc:ratechange, cinesrc:loadedmetadata,
      //   cinesrc:nextepisode, cinesrc:skipintro, cinesrc:sourceused,
      //   cinesrc:close, cinesrc:error, cinesrc:response
      if (event.origin === "https://cinesrc.st" && activeSource.providerId === "cinesrc") {
        const type = typeof data === "string" ? data : (data?.type ?? data?.event ?? "");

        switch (type) {
          case "cinesrc:ready":
            setIsLoading(false);
            setPlaybackState("PLAYER_READY");
            break;
          case "cinesrc:loadedmetadata":
            setIsLoading(false);
            if (playbackState === "DISCOVERED" || playbackState === "IFRAME_LOADED") {
              setPlaybackState("PLAYER_READY");
            }
            break;
          case "cinesrc:play":
            setIsLoading(false);
            setPlaybackState("PLAY_STARTED");
            break;
          case "cinesrc:pause":
            // Keep PLAY_STARTED — user just paused
            break;
          case "cinesrc:timeupdate":
            if (data?.currentTime && data?.duration) {
              saveProgress(data.currentTime, data.duration);
            }
            break;
          case "cinesrc:ended":
            onEnded?.();
            break;
          case "cinesrc:nextepisode": {
            // CRITICAL: when internalNavigation === true, do NOT replace iframe.
            // CineSrc handles the transition internally.
            const nextSeason = data?.season ?? (season ?? 1);
            const nextEpisode = data?.episode ?? (episode ?? 1) + 1;
            if (data?.internalNavigation === true) {
              // Let CineSrc navigate; just update our internal tracking
              setPlaybackState("PLAY_STARTED");
            } else {
              onNextEpisode?.(nextSeason, nextEpisode);
            }
            break;
          }
          case "cinesrc:sourceused":
            if (data?.source) setDiagnosticSource(String(data.source));
            break;
          case "cinesrc:error":
            setPlaybackState("PLAYBACK_ERROR");
            triggerFallback(activeIndex, "CineSrc reported a stream error.");
            break;
          case "cinesrc:skipintro":
          case "cinesrc:seeking":
          case "cinesrc:seeked":
          case "cinesrc:volumechange":
          case "cinesrc:ratechange":
          case "cinesrc:close":
          case "cinesrc:response":
            // Informational events — no action needed
            break;
        }
      }

      // ── VidSrc ───────────────────────────────────────────────────
      // Origin: https://vidsrc.sbs (also accept https://vidsrc.sh for legacy)
      // Events: { player_status: "playing"|"paused"|"error" }, { player_progress, player_duration }
      const vidsrcOrigins = ["https://vidsrc.sbs", "https://vidsrc.sh", "https://vidsrc.to"];
      if (vidsrcOrigins.includes(event.origin) && activeSource.providerId === "vidsrc") {
        if (data && typeof data === "object") {
          if (data.player_status === "playing") {
            setIsLoading(false);
            setPlaybackState("PLAY_STARTED");
          } else if (data.player_status === "paused") {
            // Keep state — user paused
          } else if (data.player_status === "error") {
            setPlaybackState("PLAYBACK_ERROR");
            triggerFallback(activeIndex, "VidSrc reported a player error.");
          }
          if (data.player_progress && data.player_duration) {
            saveProgress(data.player_progress, data.player_duration);
          }
        }
      }

      // ── NHD ──────────────────────────────────────────────────────
      // No official postMessage spec — detect common patterns
      if (event.origin === "https://nhdapi.st" && activeSource.providerId === "nhd") {
        if (data?.status === "playing" || data?.event === "play") {
          setIsLoading(false);
          setPlaybackState("PLAY_STARTED");
        } else if (data?.status === "error" || data?.event === "error") {
          setPlaybackState("PLAYBACK_ERROR");
          triggerFallback(activeIndex, "NHD stream unavailable.");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeSource, activeIndex, triggerFallback, saveProgress, onEnded, onNextEpisode, season, episode, playbackState]);

  // ─────────────────────────────────────────────────────────────────
  // PLAYER CONTROL VIA POSTMESSAGE (CineSrc)
  // Usage: sendCineSrcCommand("seek", { time: 60 })
  // ─────────────────────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sendCineSrcCommand = useCallback((command: string, args?: Record<string, unknown>) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: "cinesrc:command", command, args },
      "https://cinesrc.st"
    );
  }, []);

  // Manual source switch — only replaces iframe, preserves episode/title state
  const handleManualSwitch = (index: number) => {
    if (index === activeIndex) return;
    setIsLoading(true);
    setIsSwitching(false);
    setPlaybackState("DISCOVERED");
    setLoadTimeoutReached(false);
    setDiagnosticSource(null);
    setActiveIndex(index);
    setIframeKey((k) => k + 1);
  };

  const handleRetryAll = () => {
    setFailedIndices(new Set());
    setActiveIndex(0);
    setIsLoading(true);
    setIsSwitching(false);
    setPlaybackState("DISCOVERED");
    setLoadTimeoutReached(false);
    setIframeKey((k) => k + 1);
    fallbackCooling.current = false;
  };

  const handleFullscreen = () => {
    const el = iframeRef.current as HTMLIFrameElement | null;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  };

  // ─── Playback state badge color ──────────────────────────────────
  const stateBadge: Record<ContentPlaybackStatus, { label: string; cls: string }> = {
    DISCOVERED:     { label: "Connecting…",  cls: "bg-zinc-800 text-zinc-400" },
    HTTP_OK:        { label: "Reached",       cls: "bg-blue-900 text-blue-300" },
    IFRAME_LOADED:  { label: "Loaded",        cls: "bg-indigo-900 text-indigo-300" },
    PLAYER_READY:   { label: "Ready",         cls: "bg-amber-900 text-amber-300" },
    PLAY_STARTED:   { label: "▶ Playing",     cls: "bg-emerald-900 text-emerald-300" },
    PLAYBACK_ERROR: { label: "⚠ Error",       cls: "bg-rose-900 text-rose-300" },
    UNAVAILABLE:    { label: "Unavailable",   cls: "bg-rose-900 text-rose-300" },
  };
  const badge = stateBadge[playbackState] ?? stateBadge["DISCOVERED"];

  return (
    <div className="w-full space-y-3 font-sans">
      {/* ── Player Container ─────────────────────────────────────── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden bg-[#09090C] border border-white/10 shadow-2xl"
        style={{ aspectRatio: "16/9", maxHeight: "82vh" }}
      >
        {/* Top overlay badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
          {activeSource && !allFailed && (
            <>
              {/* Provider badge */}
              <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white">
                {activeSource.providerName}
              </span>
              {/* Playback state badge */}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.cls}`}>
                {badge.label}
              </span>
              {/* Diagnostic source badge (CineSrc sourceused) */}
              {diagnosticSource && (
                <span className="px-2 py-1 rounded-full bg-zinc-900/70 text-[9px] text-zinc-400 border border-white/5">
                  src: {diagnosticSource}
                </span>
              )}
            </>
          )}
        </div>

        {/* Controls top-right */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {isDev && (
            <button
              onClick={() => setShowDiag((v) => !v)}
              className="px-2 py-1 rounded-lg bg-zinc-900/80 text-[9px] text-zinc-400 border border-white/10 cursor-pointer hover:bg-zinc-800"
              title="Toggle playback diagnostics"
            >
              DIAG
            </button>
          )}
          <button
            onClick={handleFullscreen}
            className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer transition"
            title="Fullscreen"
          >
            <IconFullscreen className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Switching overlay */}
        {isSwitching && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#09090C]/90 text-center p-6">
            <div className="w-8 h-8 border-2 border-[#FF3B6B] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-zinc-300">{switchMsg}</p>
          </div>
        )}

        {/* Load timeout banner */}
        {!isSwitching && loadTimeoutReached && !allFailed && playbackState !== "PLAY_STARTED" && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 py-3 bg-amber-900/90 backdrop-blur-sm border-t border-amber-700/50">
            <p className="text-xs text-amber-200">
              {activeSource?.providerName} is taking longer than expected.
            </p>
            <button
              onClick={() => triggerFallback(activeIndex, "Load timeout.")}
              className="px-3 py-1.5 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 border border-amber-400/50 text-amber-200 text-xs font-bold cursor-pointer"
            >
              Try Next Source →
            </button>
          </div>
        )}

        {/* Loading spinner */}
        {isLoading && !allFailed && !isSwitching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#09090C]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-[#FF3B6B] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-500">
                Loading {activeSource?.providerName ?? "player"}…
              </p>
            </div>
          </div>
        )}

        {/* All Failed state */}
        {allFailed ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#09090C] text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mb-4">
              ⚠️
            </div>
            <h3 className="text-base font-bold text-white mb-1">No playable source available</h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-5">
              {sources.length > 0
                ? `Tried ${sources.length} provider(s) — CineSrc, VidSrc${sources.length > 2 ? ", and others" : ""}. None could provide a stream right now.`
                : "No active playback providers could be resolved for this title."}
            </p>
            <button
              onClick={handleRetryAll}
              className="px-5 py-2.5 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25 cursor-pointer"
            >
              Retry All Sources
            </button>
          </div>
        ) : (
          activeSource && (
            <iframe
              key={iframeKey}
              ref={iframeRef}
              id="chiller-external-iframe"
              src={activeSource.url}
              title={title}
              referrerPolicy="origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              onLoad={() => {
                setIsLoading(false);
                setPlaybackState((prev) =>
                  prev === "DISCOVERED" ? "IFRAME_LOADED" : prev
                );
              }}
              onError={() => triggerFallback(activeIndex, `${activeSource.providerName} iframe failed to load.`)}
              className="w-full h-full border-0 absolute inset-0 z-0 bg-black"
            />
          )
        )}
      </div>

      {/* ── Source Selector Bar ───────────────────────────────────── */}
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#0F172A]/80 border border-white/[0.08] backdrop-blur-md">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Sources:
            </span>
            {sources.map((source, idx) => {
              const isFailed = failedIndices.has(idx);
              const isActive = idx === activeIndex;
              return (
                <button
                  key={source.providerId + idx}
                  onClick={() => handleManualSwitch(idx)}
                  disabled={isFailed}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                    isActive
                      ? "bg-[#FF3B6B]/20 border-[#FF3B6B]/50 text-[#FF3B6B]"
                      : isFailed
                      ? "bg-zinc-900/50 border-zinc-800 text-zinc-600 line-through cursor-not-allowed"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                  title={isFailed ? `${source.providerName} failed` : `Switch to ${source.providerName}`}
                >
                  {source.providerName}
                  {isFailed && " ✕"}
                </button>
              );
            })}
          </div>

          {/* Retry if some failed */}
          {failedIndices.size > 0 && !allFailed && (
            <button
              onClick={handleRetryAll}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
            >
              Reset all
            </button>
          )}
        </div>
      )}

      {/* ── Dev Diagnostic Panel (NODE_ENV=development only) ─────── */}
      {isDev && showDiag && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-950/80 p-4 text-[11px] font-mono space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-300 font-bold text-xs">⚙ Playback Diagnostics</span>
            <button
              onClick={() => setShowDiag(false)}
              className="text-zinc-600 hover:text-zinc-400 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-400">
            <span className="text-zinc-500">Content</span>
            <span className="text-white">{mediaType?.toUpperCase()} — TMDB {tmdbId ?? anilistId}</span>
            {mediaType === "tv" && (
              <>
                <span className="text-zinc-500">Season / Episode</span>
                <span className="text-white">S{season} E{episode}</span>
              </>
            )}
            <span className="text-zinc-500">Active Provider</span>
            <span className="text-white">{activeSource?.providerName ?? "—"} (Priority {activeSource?.priority})</span>
            <span className="text-zinc-500">Embed URL</span>
            <span className="text-blue-400 break-all">{activeSource?.url ?? "—"}</span>
            <span className="text-zinc-500">Iframe</span>
            <span>{playbackState === "DISCOVERED" ? "LOADING" : playbackState === "IFRAME_LOADED" ? "✓ LOADED" : playbackState === "UNAVAILABLE" ? "✗ FAILED" : "✓ OK"}</span>
            <span className="text-zinc-500">Player</span>
            <span>{["PLAYER_READY", "PLAY_STARTED"].includes(playbackState) ? "✓ READY" : "NOT VERIFIED"}</span>
            <span className="text-zinc-500">Playback</span>
            <span className={playbackState === "PLAY_STARTED" ? "text-emerald-400" : playbackState === "PLAYBACK_ERROR" ? "text-rose-400" : "text-zinc-400"}>
              {playbackState === "PLAY_STARTED" ? "▶ PLAYING" : playbackState === "PLAYBACK_ERROR" ? "✗ FAILED" : "NOT VERIFIED"}
            </span>
            {diagnosticSource && (
              <>
                <span className="text-zinc-500">CineSrc Server</span>
                <span className="text-zinc-300">{diagnosticSource}</span>
              </>
            )}
            <span className="text-zinc-500">Failed Sources</span>
            <span className="text-rose-400">
              {failedIndices.size === 0
                ? "none"
                : sources
                    .filter((_, i) => failedIndices.has(i))
                    .map((s) => s.providerName)
                    .join(", ")}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1">
            <div className="text-zinc-500 mb-1">All candidates ({sources.length}):</div>
            {sources.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={failedIndices.has(i) ? "text-rose-500" : i === activeIndex ? "text-emerald-400" : "text-zinc-500"}>
                  {failedIndices.has(i) ? "✗" : i === activeIndex ? "▶" : "○"} [{s.priority}] {s.providerName}
                </span>
                <span className="text-zinc-700 break-all">{s.url}</span>
              </div>
            ))}
          </div>
          {/* CineSrc command tester */}
          {activeSource?.providerId === "cinesrc" && (
            <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-2">
              <span className="text-zinc-500">CineSrc cmd:</span>
              {["play", "pause"].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => sendCineSrcCommand(cmd)}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] cursor-pointer"
                >
                  {cmd}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
