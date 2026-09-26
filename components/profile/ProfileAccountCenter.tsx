"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/ui/ToastProvider";
import {
  IconPlay,
  IconMovie,
  IconAnime,
  IconCheck,
  IconUser,
  IconSettings,
} from "@/components/icons";

interface ProfileAccountCenterProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    adsFree?: boolean;
    createdAt?: Date | string;
    stats: {
      watchlistCount: number;
      historyCount: number;
      continueWatchingCount: number;
    };
  };
}

export function ProfileAccountCenter({ user }: ProfileAccountCenterProps) {
  const { showToast } = useToast();

  // Local preferences state
  const [preferredAudio, setPreferredAudio] = useState<string>("en");
  const [autoplayNext, setAutoplayNext] = useState<boolean>(true);
  const [defaultQuality, setDefaultQuality] = useState<string>("auto");
  const [cinemaModeTimeout, setCinemaModeTimeout] = useState<number>(3);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"preferences" | "activity" | "security">("preferences");

  useEffect(() => {
    try {
      const storedAudio = localStorage.getItem("chiller_preferred_audio") || "en";
      const storedAutoplay = localStorage.getItem("chiller_autoplay_next");
      const storedQuality = localStorage.getItem("chiller_default_quality") || "auto";
      const storedCinema = localStorage.getItem("chiller_cinema_timeout") || "3";
      const storedMotion = localStorage.getItem("chiller_reduced_motion");

      setPreferredAudio(storedAudio);
      if (storedAutoplay !== null) setAutoplayNext(storedAutoplay === "true");
      setDefaultQuality(storedQuality);
      setCinemaModeTimeout(parseInt(storedCinema, 10) || 3);
      if (storedMotion !== null) setReducedMotion(storedMotion === "true");
    } catch {
      // Non-blocking fallback
    }
  }, []);

  const handleSaveAudio = (lang: string) => {
    setPreferredAudio(lang);
    localStorage.setItem("chiller_preferred_audio", lang);
    showToast(`Preferred anime audio set to: ${lang === "en" ? "English Dub" : "Original Japanese"}`, "success");
  };

  const handleToggleAutoplay = () => {
    const next = !autoplayNext;
    setAutoplayNext(next);
    localStorage.setItem("chiller_autoplay_next", String(next));
    showToast(`Autoplay next episode: ${next ? "Enabled" : "Disabled"}`, "info");
  };

  const handleSaveQuality = (quality: string) => {
    setDefaultQuality(quality);
    localStorage.setItem("chiller_default_quality", quality);
    showToast(`Default stream quality set to: ${quality.toUpperCase()}`, "success");
  };

  const handleSaveCinemaTimeout = (seconds: number) => {
    setCinemaModeTimeout(seconds);
    localStorage.setItem("chiller_cinema_timeout", String(seconds));
    showToast(`Cinema mode auto-hide set to: ${seconds}s`, "info");
  };

  const handleToggleReducedMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    localStorage.setItem("chiller_reduced_motion", String(next));
    showToast(`Reduced motion: ${next ? "Enabled" : "Disabled"}`, "info");
  };

  return (
    <div className="space-y-6">
      {/* ── User Overview Banner ── */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#12121A] to-[#09090C] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#FF3B6B]/10 via-[#8A5CFF]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#FF3B6B] to-[#8A5CFF] text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl shadow-[#FF3B6B]/25 flex-shrink-0">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user.name || "Chiller Viewer"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/10 text-zinc-300 border border-white/10">
                  {user.role || "MEMBER"}
                </span>
                {user.adsFree && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    ADS-FREE ACCOUNT
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  FREE ACCESS
                </span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-400 mt-1">{user.email}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "2026"}
              </p>
            </div>
          </div>

          {/* Quick Statistics */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto text-center">
            <Link
              href="/watchlist"
              className="p-2 sm:p-3 rounded-2xl hover:bg-white/5 transition block group"
            >
              <span className="text-xl sm:text-2xl font-black text-white block group-hover:text-[#FF3B6B] transition">
                {user.stats.watchlistCount}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                My List
              </span>
            </Link>

            <Link
              href="/history"
              className="p-2 sm:p-3 rounded-2xl hover:bg-white/5 transition block group"
            >
              <span className="text-xl sm:text-2xl font-black text-white block group-hover:text-[#8A5CFF] transition">
                {user.stats.historyCount}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                History
              </span>
            </Link>

            <Link
              href="/"
              className="p-2 sm:p-3 rounded-2xl hover:bg-white/5 transition block group"
            >
              <span className="text-xl sm:text-2xl font-black text-white block group-hover:text-amber-400 transition">
                {user.stats.continueWatchingCount}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Watching
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "preferences"
              ? "bg-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25"
              : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <IconSettings className="w-3.5 h-3.5" />
          <span>Playback & Audio</span>
        </button>

        <button
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "activity"
              ? "bg-[#8A5CFF] text-white shadow-lg shadow-[#8A5CFF]/25"
              : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <IconPlay className="w-3.5 h-3.5" />
          <span>My Activity</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "security"
              ? "bg-white/20 text-white"
              : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <IconUser className="w-3.5 h-3.5" />
          <span>Account Security</span>
        </button>
      </div>

      {/* ── TAB 1: Playback & Audio Preferences ── */}
      {activeTab === "preferences" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Preferred Anime Audio */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#121218] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🎙️</span>
                <span>Default Anime Audio Preference</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Choose your default language when starting anime playback. English Dub uses English-capable sources when available.
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleSaveAudio("en")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  preferredAudio === "en"
                    ? "bg-[#8A5CFF] text-white shadow-md shadow-[#8A5CFF]/25"
                    : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"
                }`}
              >
                {preferredAudio === "en" && <IconCheck className="w-3.5 h-3.5" />}
                <span>English Dub</span>
              </button>

              <button
                onClick={() => handleSaveAudio("ja")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  preferredAudio === "ja"
                    ? "bg-[#8A5CFF] text-white shadow-md shadow-[#8A5CFF]/25"
                    : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"
                }`}
              >
                {preferredAudio === "ja" && <IconCheck className="w-3.5 h-3.5" />}
                <span>Original Sub</span>
              </button>
            </div>
          </div>

          {/* Autoplay Next Episode */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#121218] flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⏭️</span>
                <span>Autoplay Next Episode</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Automatically resolve and transition to the next episode when the current episode ends.
              </p>
            </div>

            <button
              onClick={handleToggleAutoplay}
              className={`w-12 h-7 rounded-full transition cursor-pointer p-1 relative flex-shrink-0 ${
                autoplayNext ? "bg-[#FF3B6B]" : "bg-zinc-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoplayNext ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Default Streaming Quality */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#121218] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📺</span>
                <span>Preferred Video Quality</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Requested resolution across compatible sources and players.
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {[
                { id: "auto", label: "Auto (Optimal)" },
                { id: "1080p", label: "1080p FHD" },
                { id: "720p", label: "720p HD" },
              ].map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleSaveQuality(q.id)}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    defaultQuality === q.id
                      ? "bg-[#FF3B6B] text-white shadow-md shadow-[#FF3B6B]/25"
                      : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cinema Mode Auto-Hide Delay */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#121218] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⏱️</span>
                <span>Player Controls Auto-Hide</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Time before player controls fade into clean cinema mode during active playback.
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {[
                { sec: 2, label: "2s" },
                { sec: 3, label: "3s (Default)" },
                { sec: 5, label: "5s" },
              ].map((t) => (
                <button
                  key={t.sec}
                  onClick={() => handleSaveCinemaTimeout(t.sec)}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    cinemaModeTimeout === t.sec
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#121218] flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>✨</span>
                <span>Reduced Motion</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Minimize UI transition animations for smoother rendering on low-power devices.
              </p>
            </div>

            <button
              onClick={handleToggleReducedMotion}
              className={`w-12 h-7 rounded-full transition cursor-pointer p-1 relative flex-shrink-0 ${
                reducedMotion ? "bg-[#FF3B6B]" : "bg-zinc-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  reducedMotion ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: My Activity ── */}
      {activeTab === "activity" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
          <Link
            href="/watchlist"
            className="p-6 rounded-2xl border border-white/10 bg-[#121218] hover:border-[#FF3B6B]/40 transition group block"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📋</span>
              <span className="text-xs font-bold text-[#FF3B6B] group-hover:translate-x-1 transition-transform">
                View All →
              </span>
            </div>
            <h3 className="text-base font-bold text-white">My Watchlist</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {user.stats.watchlistCount} saved movies, anime, and series.
            </p>
          </Link>

          <Link
            href="/history"
            className="p-6 rounded-2xl border border-white/10 bg-[#121218] hover:border-[#8A5CFF]/40 transition group block"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🕒</span>
              <span className="text-xs font-bold text-[#8A5CFF] group-hover:translate-x-1 transition-transform">
                View All →
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Watch History</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {user.stats.historyCount} completed and in-progress playback sessions.
            </p>
          </Link>
        </div>
      )}

      {/* ── TAB 3: Account Security ── */}
      {activeTab === "security" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl border border-white/10 bg-[#121218] space-y-3">
            <h3 className="text-sm font-bold text-white">Security & Password</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Manage your credentials and active device sessions. For security, never share your account password.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/change-password"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition border border-white/10"
              >
                Change Password
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold transition border border-rose-500/30 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-[#121218] flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white">Device Session</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Current browser session active with secure HTTP-only session cookies.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
              ACTIVE
            </span>
          </div>
        </div>
      )}

      {/* ── Brand Experience Card ── */}
      <div className="p-5 rounded-2xl border border-white/10 bg-[#121218] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🎬</span>
            <span>Official CHILLER Opening Experience</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Replay the signature 10-second cinematic intro sequence or reset first-launch status.
          </p>
        </div>
        <Link
          href="/intro"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-xs font-bold hover:opacity-95 shadow-md shadow-[#FF3B6B]/20 transition text-center w-full sm:w-auto"
        >
          Replay Intro
        </Link>
      </div>
    </div>
  );
}
