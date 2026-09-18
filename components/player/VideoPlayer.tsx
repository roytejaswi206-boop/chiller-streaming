"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  IconForward10,
  IconFullscreen,
  IconMute,
  IconPause,
  IconPip,
  IconPlay,
  IconRewind10,
  IconSettings,
  IconVolume,
} from "@/components/icons";
import { formatDuration } from "@/lib/utils";

export interface VideoPlayerProps {
  streamUrl: string;
  backupStreamUrls?: string[];
  title: string;
  posterUrl?: string;
  subtitles?: { language: string; label: string; url: string }[];
  audioTracks?: { language: string; label: string }[];
  qualities?: { quality: string; bitrate?: number }[];
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onViewRegistered?: () => void;
}

export function VideoPlayer({
  streamUrl,
  backupStreamUrls = [],
  title,
  posterUrl,
  subtitles = [],
  qualities = [],
  autoPlay = false,
  onTimeUpdate,
  onEnded,
  onViewRegistered,
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

  // Settings & Menus
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState<string>("Auto");
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("Off");
  const [theaterMode, setTheaterMode] = useState(false);

  // Scrubbing & Hover Tooltip
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);

  // Active Origin Index for Failover
  const [currentOriginIdx, setCurrentOriginIdx] = useState(0);
  const allUrls = [streamUrl, ...backupStreamUrls].filter(Boolean);

  // View count threshold tracker (register view after 5s or 10% playback)
  const viewRegisteredRef = useRef(false);

  // 1. Initialize HLS or Native Video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setHasError(false);
    setIsBuffering(true);

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
        if (autoPlay) {
          video.play().catch(() => {});
        }
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
        if (autoPlay) video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentOriginIdx, streamUrl]);

  // 2. Play / Pause Handling
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // 3. 10-Second Seek Controls
  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = target;
    setCurrentTime(target);
  };

  // 4. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when user is focused on an input or textarea
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 5. Auto-Hide Controls on Inactivity
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
        setShowSettingsMenu(false);
      }, 3000);
    }
  };

  // 6. Time and Buffer Progress Updates
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

    // View Registration (Configurable rule: minimum 5s or 10% progress)
    if (!viewRegisteredRef.current && (cur >= 5 || (dur > 0 && cur / dur >= 0.1))) {
      viewRegisteredRef.current = true;
      if (onViewRegistered) onViewRegistered();
    }

    if (onTimeUpdate) onTimeUpdate(cur, dur);
  };

  // 7. Fullscreen & PiP
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
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

  // 8. Volume & Mute
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

  // 9. Speed Changer
  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);
  };

  // 10. Quality Changer
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

  // 11. Scrubber Progress Handling
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * duration;
    video.currentTime = target;
    setCurrentTime(target);
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(e.clientX - rect.left);
    setHoverTime(pos * duration);
  };

  const availableSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const availableQualities = [
    "Auto",
    ...qualities.map((q) => q.quality),
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black select-none group border border-white/[0.08] shadow-2xl ${
        theaterMode ? "max-w-none" : ""
      }`}
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
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
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

      {/* Error State with Retry Button & Multi-Origin Fallback */}
      {hasError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
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

      {/* Big Center Play / Pause Indicator (when controls are visible) */}
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

      {/* Custom Bottom Player Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber Progress Bar */}
        <div
          onClick={handleProgressBarClick}
          onMouseMove={handleProgressBarMouseMove}
          onMouseEnter={() => setIsScrubbing(true)}
          onMouseLeave={() => {
            setIsScrubbing(false);
            setHoverTime(null);
          }}
          className="relative w-full h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer mb-3 transition-all duration-150"
        >
          {/* Hover Time Tooltip */}
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
            {/* Scrubber Thumb */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md shadow-black/50 transform scale-0 hover:scale-100 transition" />
          </div>
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between gap-3 text-white">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            {/* Play / Pause */}
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

            {/* 10s Rewind (↶ 10s) */}
            <button
              onClick={() => seekRelative(-10)}
              title="Rewind 10 seconds (← key)"
              className="flex items-center gap-0.5 p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <IconRewind10 className="w-5 h-5" />
              <span className="text-[10px] font-bold">10s</span>
            </button>

            {/* 10s Forward (10s ↷) */}
            <button
              onClick={() => seekRelative(10)}
              title="Forward 10 seconds (→ key)"
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

            {/* Time Stamp Display */}
            <div className="text-[11px] font-medium text-zinc-300 ml-1">
              <span>{formatDuration(currentTime)}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span className="text-zinc-400">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 relative">
            {/* Speed Badge Button */}
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold text-zinc-200 transition cursor-pointer"
            >
              {playbackSpeed}x
            </button>

            {/* Quality Badge Button */}
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
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

            {/* Picture-in-Picture Button */}
            <button
              onClick={togglePiP}
              title="Picture in Picture"
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer hidden sm:block"
            >
              <IconPip className="w-4 h-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title="Fullscreen (F key)"
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <IconFullscreen className="w-4 h-4" />
            </button>

            {/* Settings Popover Menu */}
            {showSettingsMenu && (
              <div
                onMouseLeave={() => setShowSettingsMenu(false)}
                className="absolute bottom-10 right-0 w-64 rounded-2xl border border-white/10 bg-[#12121c]/95 backdrop-blur-xl p-3 shadow-2xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2 py-1.5 font-bold text-white border-b border-white/[0.08] mb-2 flex justify-between items-center">
                  <span>Playback Settings</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    HLS {Hls.isSupported() ? "Active" : "Native"}
                  </span>
                </div>

                {/* Speed Selection */}
                <div className="mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block px-2 mb-1.5">
                    Speed
                  </span>
                  <div className="grid grid-cols-3 gap-1 px-1">
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

                {/* Quality Selection */}
                {availableQualities.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block px-2 mb-1.5">
                      Quality
                    </span>
                    <div className="flex flex-wrap gap-1 px-1">
                      {availableQualities.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleQualityChange(q)}
                          className={`py-1 px-2.5 rounded font-semibold cursor-pointer transition ${
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
