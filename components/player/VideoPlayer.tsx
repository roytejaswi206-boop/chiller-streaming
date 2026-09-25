"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  IconForward10,
  IconFullscreen,
  IconMute,
  IconPause,
  IconPip,
  IconPlay,
  IconRewind10,
  IconRotate,
  IconSettings,
  IconVolume,
} from "@/components/icons";
import { formatDuration } from "@/lib/utils";
import {
  NormalizedAudioTrack,
  normalizeAudioTracks,
  getStoredAudioPreference,
  setStoredAudioPreference,
  selectBestAudioTrack,
} from "@/lib/playback/audio-normalizer";

const PLAYER_CONTROLS_AUTO_HIDE_MS = 3000;

export interface VideoPlayerProps {
  streamUrl: string;
  backupStreamUrls?: string[];
  title: string;
  posterUrl?: string;
  subtitles?: { language: string; label: string; url: string }[];
  audioTracks?: { language: string; label: string }[];
  qualities?: { quality: string; bitrate?: number }[];
  autoPlay?: boolean;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onViewRegistered?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function VideoPlayer({
  streamUrl,
  backupStreamUrls = [],
  title,
  posterUrl,
  subtitles = [],
  qualities = [],
  autoPlay = false,
  initialTime = 0,
  onTimeUpdate,
  onEnded,
  onViewRegistered,
  onFullscreenChange,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [orientationHint, setOrientationHint] = useState<string | null>(null);

  // Settings & Menus
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"audio" | "quality" | "speed" | "subtitles">("audio");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState<string>("Auto");
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("Off");
  const [theaterMode, setTheaterMode] = useState(false);

  // Audio Tracks (Source-Aware Real Audio)
  const [availableAudioTracks, setAvailableAudioTracks] = useState<NormalizedAudioTrack[]>([]);
  const [activeAudioTrackId, setActiveAudioTrackId] = useState<string>("");
  const [audioSwitchStatus, setAudioSwitchStatus] = useState<"IDLE" | "SWITCHING" | "CONFIRMED" | "FAILED" | "UNSUPPORTED">("IDLE");
  const [audioToast, setAudioToast] = useState<string | null>(null);

  // Resume State
  const resumeAppliedRef = useRef(false);

  // Synchronize True Device Fullscreen State
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      onFullscreenChange?.(isFull);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [onFullscreenChange]);

  // Lock body scroll during fullscreen
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
  const [resumeToast, setResumeToast] = useState<string | null>(null);

  // Scrubbing & Hover Tooltip
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);

  // Active Origin Index for Failover
  const [currentOriginIdx, setCurrentOriginIdx] = useState(0);
  const allUrls = [streamUrl, ...backupStreamUrls].filter(Boolean);

  // View count threshold tracker (register view after 5s or 10% playback)
  const viewRegisteredRef = useRef(false);

  // Single Controls Auto-Hide Timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    // Only auto-hide if actively playing, not scrubbing, and no menu is open
    if (isPlaying && !showSettingsMenu && !isScrubbing && !hasError) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, PLAYER_CONTROLS_AUTO_HIDE_MS);
    }
  }, [isPlaying, showSettingsMenu, isScrubbing, hasError]);

  // Keep controls visible whenever menu opens or paused state changes
  useEffect(() => {
    if (!isPlaying || showSettingsMenu || isScrubbing || hasError) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    } else {
      resetControlsTimeout();
    }
  }, [isPlaying, showSettingsMenu, isScrubbing, hasError, resetControlsTimeout]);

  // Seek resume function with actual position verification (Sections 1, 2)
  const applyResumeSeek = useCallback((targetTime: number) => {
    const video = videoRef.current;
    if (!video || resumeAppliedRef.current || targetTime <= 0) return;

    resumeAppliedRef.current = true;
    try {
      video.currentTime = targetTime;
      setCurrentTime(targetTime);

      // Verify seek confirmation against actual player position
      setTimeout(() => {
        const actual = video.currentTime;
        if (Math.abs(actual - targetTime) <= 5) {
          setResumeToast(`Resumed at ${formatDuration(actual)}`);
        } else {
          setResumeToast(`Resume sought to ${formatDuration(targetTime)}`);
        }
        setTimeout(() => setResumeToast(null), 3500);
      }, 300);
    } catch (err) {
      console.warn("Resume seek error:", err);
    }
  }, []);

  // 1. Initialize HLS or Native Video with Audio Track Detection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setHasError(false);
    setIsBuffering(true);
    resumeAppliedRef.current = false;
    setAvailableAudioTracks([]);
    setActiveAudioTrackId("");

    const activeUrl = allUrls[currentOriginIdx] || streamUrl;

    if (Hls.isSupported() && (activeUrl.includes(".m3u8") || activeUrl.startsWith("http"))) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);

        // Audio track inspection from HLS manifest (Section 6, 8, 9)
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          const rawTracks = hls.audioTracks.map((t, idx) => ({
            id: String(t.id ?? idx),
            label: t.name || t.lang || `Track ${idx + 1}`,
            language: t.lang || t.name,
            isDefault: t.default,
          }));
          const normalized = normalizeAudioTracks(rawTracks);
          setAvailableAudioTracks(normalized);

          // Apply saved user language preference or default
          const storedPref = getStoredAudioPreference();
          const best = selectBestAudioTrack(normalized, storedPref);
          if (best) {
            const hlsIdx = hls.audioTracks.findIndex((t, idx) => String(t.id ?? idx) === String(best.id));
            if (hlsIdx !== -1 && hls.audioTrack !== hlsIdx) {
              hls.audioTrack = hlsIdx;
              setActiveAudioTrackId(String(best.id));
            } else {
              setActiveAudioTrackId(String(best.id));
            }
          } else {
            setActiveAudioTrackId(String(hls.audioTrack >= 0 ? hls.audioTrack : 0));
          }
        }

        // Apply resume on manifest parsed
        if (initialTime && initialTime > 0) {
          applyResumeSeek(initialTime);
        }

        if (autoPlay) {
          video.play().catch(() => {});
        }
      });

      // Listen for dynamic audio track updates
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
        if (data.audioTracks && data.audioTracks.length > 0) {
          const raw = data.audioTracks.map((t, idx) => ({
            id: String(t.id ?? idx),
            label: t.name || t.lang || `Track ${idx + 1}`,
            language: t.lang || t.name,
            isDefault: t.default,
          }));
          setAvailableAudioTracks(normalizeAudioTracks(raw));
        }
      });

      // Verify actual audio track switch confirmation (Section 7, 8, 9)
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
        const switchedId = String(data.id);
        setActiveAudioTrackId(switchedId);
        setAudioSwitchStatus("CONFIRMED");

        const track = hls.audioTracks[data.id];
        const label = track ? track.name || track.lang || `Track ${data.id + 1}` : "Changed";
        setAudioToast(`Audio: ${label}`);
        setTimeout(() => setAudioToast(null), 3000);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn("HLS fatal error occurred, attempting failover:", data.type);
          if (currentOriginIdx + 1 < allUrls.length) {
            setCurrentOriginIdx((prev) => prev + 1);
          } else {
            setHasError(true);
            setErrorMessage("Playback temporarily unavailable on current origin.");
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl") || activeUrl.endsWith(".mp4")) {
      // Native Safari / iOS HLS or MP4
      video.src = activeUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsBuffering(false);

        // Feature detection for native audioTracks (Section 10)
        const nativeTracks = (video as any).audioTracks;
        if (nativeTracks && typeof nativeTracks.length === "number" && nativeTracks.length > 0) {
          const raw = Array.from(nativeTracks).map((t: any, idx: number) => ({
            id: String(t.id || idx),
            label: t.label || t.language || `Track ${idx + 1}`,
            language: t.language || t.label,
            isDefault: t.enabled,
          }));
          setAvailableAudioTracks(normalizeAudioTracks(raw));
        } else {
          setAudioSwitchStatus("UNSUPPORTED");
        }

        if (initialTime && initialTime > 0) {
          applyResumeSeek(initialTime);
        }

        if (autoPlay) video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [currentOriginIdx, streamUrl, initialTime, applyResumeSeek, autoPlay]);

  // Audio track switcher with verification
  const handleAudioTrackChange = (trackId: string) => {
    setAudioSwitchStatus("SWITCHING");

    if (hlsRef.current) {
      const idx = hlsRef.current.audioTracks.findIndex(
        (t, i) => String(t.id ?? i) === trackId
      );
      if (idx !== -1) {
        hlsRef.current.audioTrack = idx;
        const sel = availableAudioTracks.find((t) => String(t.id) === trackId);
        if (sel) {
          setStoredAudioPreference(sel.languageCode);
        }
      }
      return;
    }

    // Native audioTracks fallback
    const video = videoRef.current;
    const nativeTracks = video ? (video as any).audioTracks : null;
    if (nativeTracks && typeof nativeTracks.length === "number") {
      for (let i = 0; i < nativeTracks.length; i++) {
        nativeTracks[i].enabled = String(nativeTracks[i].id || i) === trackId;
      }
      setActiveAudioTrackId(trackId);
      setAudioSwitchStatus("CONFIRMED");
      const sel = availableAudioTracks.find((t) => String(t.id) === trackId);
      if (sel) {
        setStoredAudioPreference(sel.languageCode);
        setAudioToast(`Audio: ${sel.label}`);
        setTimeout(() => setAudioToast(null), 3000);
      }
    }
  };

  // Play / Pause Handling
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  };

  // 10-Second Seek Controls
  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = target;
    setCurrentTime(target);
    resetControlsTimeout();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekRelative(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekRelative(10);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "Escape":
          setShowSettingsMenu(false);
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isMuted, volume]);

  // Time and Buffer Progress Updates
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const cur = video.currentTime;
    const dur = video.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);

    // Buffer tracking
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBufferedPercent((bufferedEnd / (dur || 1)) * 100);
    }

    // View Registration
    if (!viewRegisteredRef.current && (cur >= 5 || (dur > 0 && cur / dur >= 0.1))) {
      viewRegisteredRef.current = true;
      if (onViewRegistered) onViewRegistered();
    }

    if (onTimeUpdate) onTimeUpdate(cur, dur);
  };

  // Fullscreen & Orientation Rotate (Section 19)
  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          if (video && (video as any).webkitEnterFullscreen) {
            (video as any).webkitEnterFullscreen();
          }
        });
        setIsFullscreen(true);
        onFullscreenChange?.(true);
      } else if ((video as any)?.webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
        setIsFullscreen(true);
        onFullscreenChange?.(true);
      } else {
        setIsFullscreen(true);
        onFullscreenChange?.(true);
      }
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
      onFullscreenChange?.(false);
    }
  };

  const handleRotate = async () => {
    const container = containerRef.current;
    try {
      if (!document.fullscreenElement && container) {
        await container.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      }

      const orientationApi = typeof screen !== "undefined" ? (screen.orientation as any) : null;
      if (orientationApi && typeof orientationApi.lock === "function") {
        if (isLandscape) {
          try {
            await orientationApi.unlock?.();
          } catch {
            // Ignore
          }
          setIsLandscape(false);
        } else {
          await orientationApi.lock("landscape");
          setIsLandscape(true);
        }
      } else {
        setOrientationHint("Rotate device for landscape cinema mode.");
        setTimeout(() => setOrientationHint(null), 3500);
      }
    } catch {
      setOrientationHint("Rotate device for landscape cinema mode.");
      setTimeout(() => setOrientationHint(null), 3500);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  // Volume & Mute
  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    setVolume(newVolume);
    video.volume = newVolume;
    if (newVolume === 0) {
      setIsMuted(true);
      video.muted = true;
    } else {
      setIsMuted(false);
      video.muted = false;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume || 1;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  // Speed Changer
  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);
  };

  // Quality Changer
  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    if (hlsRef.current) {
      if (quality === "Auto") {
        hlsRef.current.currentLevel = -1;
      } else {
        const levelIdx = hlsRef.current.levels.findIndex(
          (l) => `${l.height}p` === quality || `${l.height}` === quality
        );
        if (levelIdx !== -1) {
          hlsRef.current.currentLevel = levelIdx;
        }
      }
    }
    setShowSettingsMenu(false);
  };

  // Scrubber Progress & Touch Scrubbing Handling
  const isDraggingScrubberRef = useRef(false);

  const seekToPosition = (clientX: number, rect: DOMRect) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const target = pos * duration;
    video.currentTime = target;
    setCurrentTime(target);
  };

  const handleScrubberPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingScrubberRef.current = true;
    setIsScrubbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToPosition(e.clientX, e.currentTarget.getBoundingClientRect());
    resetControlsTimeout();
  };

  const handleScrubberPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(e.clientX - rect.left);
    setHoverTime(pos * duration);
    if (isDraggingScrubberRef.current) {
      seekToPosition(e.clientX, rect);
    }
  };

  const handleScrubberPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingScrubberRef.current) {
      isDraggingScrubberRef.current = false;
      setIsScrubbing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      resetControlsTimeout();
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekToPosition(e.clientX, rect);
    resetControlsTimeout();
  };

  const availableSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const availableQualities = ["Auto", ...qualities.map((q) => q.quality)];

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      onMouseLeave={() => isPlaying && !showSettingsMenu && setControlsVisible(false)}
      className={`relative w-full overflow-hidden bg-black select-none group transition-all duration-200 ${
        isFullscreen
          ? "fixed inset-0 w-screen h-screen z-[9999] rounded-none border-0 m-0 p-0"
          : "aspect-video rounded-2xl border border-white/[0.08] shadow-2xl"
      } ${theaterMode ? "max-w-none" : ""}`}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        poster={posterUrl}
        playsInline
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
          resetControlsTimeout();
        }}
        onPause={() => {
          setIsPlaying(false);
          setControlsVisible(true);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setControlsVisible(true);
          if (onEnded) onEnded();
        }}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Buffering Spinner */}
      {isBuffering && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-12 h-12 border-3 border-[#FF3864]/20 border-t-[#FF3864] rounded-full animate-spin" />
        </div>
      )}

      {/* Resume Confirmation Toast */}
      {resumeToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-[#FF3864]/40 text-[#FF3864] text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>⏱️</span>
          <span>{resumeToast}</span>
        </div>
      )}

      {/* Audio Track Switch Toast */}
      {audioToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>🔊</span>
          <span>{audioToast}</span>
        </div>
      )}

      {/* Orientation Fallback Hint */}
      {orientationHint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-black/90 border border-white/20 text-white text-xs font-medium shadow-2xl">
          {orientationHint}
        </div>
      )}

      {/* Top Header Badge & Rotate (Auto-Hides in Clean Cinema Mode) */}
      <div
        className={`absolute top-3 left-3 right-3 z-30 flex items-center justify-between transition-all duration-300 ${
          controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-extrabold text-white">
            {title}
          </span>
          {availableAudioTracks.length > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold">
              🌐 Multilingual ({availableAudioTracks.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRotate}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-zinc-300 hover:text-white transition cursor-pointer text-[11px] font-bold"
            title="Rotate to Landscape"
          >
            <IconRotate className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rotate</span>
          </button>
        </div>
      </div>

      {/* Error State with Retry Button & Multi-Origin Fallback */}
      {hasError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
            !
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Playback temporarily unavailable
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-4">
            {errorMessage || "Origin server failed or stream connection was lost."}
          </p>
          <button
            onClick={() => {
              setHasError(false);
              setCurrentOriginIdx((prev) => (prev + 1) % Math.max(1, allUrls.length));
            }}
            className="py-2 px-5 rounded-full velora-gradient text-white text-xs font-bold shadow-lg shadow-rose-600/30 hover:opacity-95 transition cursor-pointer"
          >
            Retry Alternative Origin
          </button>
        </div>
      )}

      {/* Center Play / Pause Indicator */}
      {controlsVisible && !isBuffering && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl transition transform hover:scale-110 pointer-events-auto cursor-pointer">
            {isPlaying ? (
              <IconPause className="w-7 h-7" />
            ) : (
              <IconPlay className="w-7 h-7 ml-1 text-[#FF3864]" />
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls Bar (Auto-Hides with Controls Engine) */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber Progress Bar Container with Touch Hitbox */}
        <div
          onPointerDown={handleScrubberPointerDown}
          onPointerMove={handleScrubberPointerMove}
          onPointerUp={handleScrubberPointerUp}
          onPointerCancel={handleScrubberPointerUp}
          onMouseEnter={() => setIsScrubbing(true)}
          onMouseLeave={() => {
            if (!isDraggingScrubberRef.current) {
              setIsScrubbing(false);
              setHoverTime(null);
            }
          }}
          className="relative w-full py-2.5 -my-2.5 cursor-pointer touch-none select-none group/scrub mb-2"
        >
          <div className="relative w-full h-1.5 group-hover/scrub:h-2.5 bg-white/20 rounded-full transition-all duration-150">
            {hoverTime !== null && (
              <div
                className="absolute -top-7 px-2 py-0.5 rounded bg-black/90 border border-white/20 text-[10px] font-bold text-white pointer-events-none -translate-x-1/2"
                style={{ left: `${hoverPos}px` }}
              >
                {formatDuration(hoverTime)}
              </div>
            )}

            {/* Buffered Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-white/40 rounded-full transition-all duration-200"
              style={{ width: `${bufferedPercent}%` }}
            />

            {/* Played Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-[#FF3864] rounded-full"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md shadow-black/50 transform scale-90 group-hover/scrub:scale-110 transition" />
            </div>
          </div>
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between gap-3 text-white">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="p-1.5 rounded-full hover:bg-white/10 text-white transition cursor-pointer"
            >
              {isPlaying ? (
                <IconPause className="w-5 h-5" />
              ) : (
                <IconPlay className="w-5 h-5 text-[#FF3864]" />
              )}
            </button>

            <button
              onClick={() => seekRelative(-10)}
              title="Rewind 10 seconds"
              className="flex items-center gap-0.5 p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <IconRewind10 className="w-5 h-5" />
              <span className="text-[10px] font-bold">10s</span>
            </button>

            <button
              onClick={() => seekRelative(10)}
              title="Forward 10 seconds"
              className="flex items-center gap-0.5 p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <IconForward10 className="w-5 h-5" />
              <span className="text-[10px] font-bold">10s</span>
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                aria-label="Mute / Unmute"
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <IconMute className="w-4 h-4 text-rose-400" />
                ) : (
                  <IconVolume className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 accent-[#FF3864] bg-white/20 rounded-full cursor-pointer hidden group-hover/vol:inline-block transition"
              />
            </div>

            {/* Timestamp */}
            <div className="text-[11px] font-medium text-zinc-300 ml-1">
              <span>{formatDuration(currentTime)}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span className="text-zinc-400">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 relative">
            {/* Audio Indicator Badge */}
            {availableAudioTracks.length > 0 && (
              <button
                onClick={() => {
                  setActiveSettingsTab("audio");
                  setShowSettingsMenu(true);
                }}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold text-zinc-200 transition cursor-pointer flex items-center gap-1"
                title="Audio Tracks"
              >
                <span>🔊</span>
                <span>
                  {availableAudioTracks.find((t) => t.id === activeAudioTrackId)?.label || "Audio"}
                </span>
              </button>
            )}

            {/* Speed Badge */}
            <button
              onClick={() => {
                setActiveSettingsTab("speed");
                setShowSettingsMenu(true);
              }}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold text-zinc-200 transition cursor-pointer"
            >
              {playbackSpeed}x
            </button>

            {/* Quality Badge */}
            <button
              onClick={() => {
                setActiveSettingsTab("quality");
                setShowSettingsMenu(true);
              }}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold text-[#FF3864] transition cursor-pointer"
            >
              {selectedQuality}
            </button>

            {/* Settings Icon Popover Button */}
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              title="Settings"
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <IconSettings className="w-4 h-4" />
            </button>

            {/* PiP */}
            <button
              onClick={togglePiP}
              title="Picture in Picture"
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer hidden sm:block"
            >
              <IconPip className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              title="Fullscreen (F)"
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <IconFullscreen className="w-4 h-4" />
            </button>

            {/* Settings Popover Menu with Real Audio Language Tabs */}
            {/* Settings Popover Menu with Real Audio Language Tabs */}
            {showSettingsMenu && (
              <>
                <div
                  className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
                  onClick={() => setShowSettingsMenu(false)}
                />
                <div
                  onMouseLeave={() => {
                    if (typeof window !== "undefined" && window.innerWidth >= 640) {
                      setShowSettingsMenu(false);
                    }
                  }}
                  className="fixed sm:absolute inset-x-0 bottom-0 sm:bottom-10 sm:right-0 sm:inset-x-auto w-full sm:w-72 rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/10 bg-[#12121c]/98 sm:bg-[#12121c]/95 backdrop-blur-2xl sm:backdrop-blur-xl p-5 sm:p-3 shadow-2xl z-50 text-xs animate-slide-up sm:animate-in sm:fade-in sm:zoom-in-95 duration-150 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 mb-3" />
                  {/* Header & Tabs */}
                  <div className="border-b border-white/[0.08] pb-2 mb-2 flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Settings</span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setActiveSettingsTab("audio")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer touch-manipulation ${
                            activeSettingsTab === "audio" ? "bg-[#FF3864] text-white" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          Audio
                        </button>
                        <button
                          onClick={() => setActiveSettingsTab("quality")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer touch-manipulation ${
                            activeSettingsTab === "quality" ? "bg-[#FF3864] text-white" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          Quality
                        </button>
                        <button
                          onClick={() => setActiveSettingsTab("speed")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer touch-manipulation ${
                            activeSettingsTab === "speed" ? "bg-[#FF3864] text-white" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          Speed
                        </button>
                      </div>
                      <button
                        onClick={() => setShowSettingsMenu(false)}
                        className="sm:hidden text-zinc-400 hover:text-white font-bold p-1 touch-manipulation text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                {/* Tab: Audio Language (Sections 5-10) */}
                {activeSettingsTab === "audio" && (
                  <div className="space-y-1.5 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Audio Tracks
                    </span>
                    {availableAudioTracks.length > 0 ? (
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {availableAudioTracks.map((track) => {
                          const trackStrId = String(track.id);
                          const isSelected = trackStrId === activeAudioTrackId;
                          return (
                            <button
                              key={trackStrId}
                              onClick={() => handleAudioTrackChange(trackStrId)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                                isSelected
                                  ? "bg-[#FF3864]/20 text-white border border-[#FF3864]/40 font-bold"
                                  : "text-zinc-300 hover:bg-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs">{track.label}</span>
                                {track.isDefault && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-zinc-400">
                                    Default
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <span className="text-[#FF3864] text-xs font-black">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-zinc-400 text-[11px] leading-relaxed">
                        Audio tracks managed by source stream or only default audio channel available.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Quality Selection */}
                {activeSettingsTab === "quality" && (
                  <div className="space-y-1.5 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Resolution
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      {availableQualities.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleQualityChange(q)}
                          className={`py-1.5 px-2.5 rounded text-center font-semibold cursor-pointer transition ${
                            selectedQuality === q
                              ? "bg-[#FF3864] text-white"
                              : "bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Speed Selection */}
                {activeSettingsTab === "speed" && (
                  <div className="space-y-1.5 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Playback Rate
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {availableSpeeds.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSpeedChange(s)}
                          className={`py-1 rounded text-center font-semibold cursor-pointer transition ${
                            playbackSpeed === s
                              ? "bg-[#FF3864] text-white"
                              : "bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
