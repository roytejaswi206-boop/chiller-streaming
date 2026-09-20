"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChillerLogo } from "@/components/icons";

interface ChillerIntroProps {
  forcePlay?: boolean;
  onComplete?: () => void;
}

export function ChillerIntro({ forcePlay = false, onComplete }: ChillerIntroProps) {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const finishIntro = useCallback(() => {
    setIsFadingOut(true);
    try {
      localStorage.setItem("chiller_intro_seen", "true");
      document.cookie = "chiller_intro_seen=true; path=/; max-age=31536000";
    } catch {
      // Ignore storage errors
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Allow CSS fade transition to finish before unmounting
    timeoutRef.current = setTimeout(() => {
      setMounted(false);
      setIsPlaying(false);
      setIsFadingOut(false);
      if (onComplete) onComplete();
    }, 700);
  }, [onComplete]);

  // Initial check on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isReplayRequested = urlParams.get("replay") === "true" || urlParams.get("intro") === "true";
      const seen = localStorage.getItem("chiller_intro_seen");
      if (!seen || forcePlay || isReplayRequested) {
        setMounted(true);
      }
    } catch {
      setMounted(true);
    }

    // Listen for manual replay requests
    const handleReplay = () => {
      setMounted(true);
      setIsFadingOut(false);
      setIsPlaying(false);
      setHasError(false);
      setShowSkip(false);
      setNeedsUserGesture(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setNeedsUserGesture(true));
      }
    };

    window.addEventListener("chiller-replay-intro", handleReplay);
    return () => {
      window.removeEventListener("chiller-replay-intro", handleReplay);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [forcePlay]);

  // Auto-play when mounted
  useEffect(() => {
    if (!mounted) return;

    // Show skip button after a short grace period (1.5 seconds)
    const skipTimer = setTimeout(() => {
      setShowSkip(true);
    }, 1500);

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("Autoplay gesture required or prevented:", err);
          setNeedsUserGesture(true);
        });
    }

    return () => clearTimeout(skipTimer);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-label="CHILLER Opening Experience"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#09090C] select-none transition-opacity duration-700 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#09090C] via-[#0F172A]/40 to-[#09090C] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#FF3B6B]/15 to-[#8A5CFF]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Video Presentation Canvas */}
      <div className="relative w-full max-w-5xl max-h-[85vh] aspect-video flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl border border-white/[0.06] bg-black">
        {/* Preloader / Fallback */}
        {(!isPlaying || hasError || needsUserGesture) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#09090C] p-6 text-center">
            <ChillerLogo className="w-16 h-16 animate-pulse mb-4" withText={false} />
            <h2 className="text-xl font-black tracking-wider text-white mb-1">CHILLER</h2>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF3B6B] mb-6">
              JUST CHILL.
            </p>

            {needsUserGesture ? (
              <button
                onClick={() => {
                  setNeedsUserGesture(false);
                  if (videoRef.current) {
                    videoRef.current
                      .play()
                      .then(() => setIsPlaying(true))
                      .catch(() => finishIntro());
                  }
                }}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#FF3B6B]/30 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                Enter CHILLER
              </button>
            ) : hasError ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400 max-w-xs">
                  Welcome to Chiller. Click below to enter the platform.
                </p>
                <button
                  onClick={finishIntro}
                  className="px-6 py-2.5 rounded-full bg-[#FF3B6B] text-white text-xs font-bold transition hover:bg-[#FF3B6B]/90 cursor-pointer"
                >
                  Continue to Home
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-[#FF3B6B] animate-ping" />
                <span>Preparing experience...</span>
              </div>
            )}
          </div>
        )}

        {/* Official CHILLER Intro Video */}
        <video
          ref={videoRef}
          src="/intro/chiller-intro.mp4"
          poster="/intro/chiller-intro-poster.jpg"
          playsInline
          muted
          autoPlay
          onEnded={finishIntro}
          onError={() => {
            setHasError(true);
            setIsPlaying(false);
          }}
          onPlaying={() => {
            setIsPlaying(true);
            setNeedsUserGesture(false);
          }}
          className={`w-full h-full object-contain transition-opacity duration-500 ${
            isPlaying ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* Skip Intro Button */}
      {showSkip && (
        <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 z-20">
          <button
            onClick={finishIntro}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold tracking-wider uppercase backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
          >
            <span>Skip Intro</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Trigger replay of the official CHILLER intro video from anywhere in the application
 */
export function replayChillerIntro() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("chiller-replay-intro"));
  }
}
