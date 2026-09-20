"use client";

import React, { useState } from "react";

interface HomepageRailConfig {
  id: string;
  title: string;
  category: string;
  enabled: boolean;
  layout: "poster" | "backdrop";
  badge?: string;
}

const DEFAULT_RAILS: HomepageRailConfig[] = [
  { id: "hero", title: "Cinematic Hero Slider", category: "hero", enabled: true, layout: "backdrop" },
  { id: "trending", title: "Trending Now", category: "trending", enabled: true, layout: "backdrop", badge: "Top 10 Global" },
  { id: "continue_watching", title: "Continue Watching", category: "history", enabled: true, layout: "backdrop" },
  { id: "trending_movies", title: "Trending Movies", category: "trending_movies", enabled: true, layout: "poster" },
  { id: "trending_tv", title: "Trending Series", category: "trending_tv", enabled: true, layout: "poster" },
  { id: "trending_anime", title: "Trending Anime", category: "anime", enabled: true, layout: "poster", badge: "AniList" },
  { id: "popular_movies", title: "Popular Movies", category: "popular", enabled: true, layout: "poster" },
  { id: "popular_tv", title: "Popular Series", category: "popular", enabled: true, layout: "poster" },
  { id: "popular_anime", title: "Popular Anime", category: "popular", enabled: true, layout: "poster", badge: "AniList" },
  { id: "now_playing", title: "New Releases (Theaters)", category: "now_playing", enabled: true, layout: "poster", badge: "#NEWRELEASE" },
  { id: "top_rated", title: "Top Rated All Time", category: "top_rated", enabled: true, layout: "poster", badge: "#TOPRATED" },
  { id: "action", title: "Action Blockbusters", category: "genre:action", enabled: true, layout: "poster" },
  { id: "scifi", title: "Sci-Fi & Cyberpunk", category: "genre:scifi", enabled: true, layout: "poster" },
  { id: "comedy", title: "Comedy & Laughs", category: "genre:comedy", enabled: true, layout: "poster" },
  { id: "thriller", title: "Thriller & Suspense", category: "genre:thriller", enabled: true, layout: "poster" },
  { id: "horror", title: "Horror & Supernatural", category: "genre:horror", enabled: true, layout: "poster" },
  { id: "kdrama", title: "K-Drama Sensations", category: "kdrama", enabled: true, layout: "poster", badge: "#KDRAMA" },
  { id: "cdrama", title: "C-Drama Epics", category: "cdrama", enabled: true, layout: "poster", badge: "#CDRAMA" },
  { id: "kids", title: "Kids & Cartoons", category: "kids", enabled: true, layout: "poster", badge: "#KIDS" },
  { id: "docs", title: "Documentaries", category: "documentary", enabled: true, layout: "poster", badge: "#DOCS" },
];

export default function AdminHomepageBuilderPage() {
  const [rails, setRails] = useState<HomepageRailConfig[]>(DEFAULT_RAILS);
  const [saved, setSaved] = useState(false);

  const toggleRail = (id: string) => {
    setRails((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    setSaved(false);
  };

  const moveRail = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rails.length) return;
    const updated = [...rails];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setRails(updated);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
            Layout CMS
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Homepage Rail Builder
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Reorder, enable, disable, and customize Discovery rails on the public Home page.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25 cursor-pointer"
        >
          {saved ? "✓ Saved Changes" : "Publish Order"}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>Rail Configuration ({rails.length} Total Sections)</span>
          <span>Status & Controls</span>
        </div>

        <div className="divide-y divide-white/5">
          {rails.map((rail, idx) => (
            <div
              key={rail.id}
              className={`p-4 flex items-center justify-between gap-4 transition ${
                rail.enabled ? "bg-transparent" : "bg-black/30 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-xs font-mono text-zinc-500 font-bold">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{rail.title}</span>
                    {rail.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30">
                        {rail.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Query: {rail.category} • Layout: {rail.layout}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => moveRail(idx, "up")}
                  disabled={idx === 0}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 cursor-pointer"
                  title="Move Up"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveRail(idx, "down")}
                  disabled={idx === rails.length - 1}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 cursor-pointer"
                  title="Move Down"
                >
                  ▼
                </button>
                <button
                  onClick={() => toggleRail(rail.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    rail.enabled
                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {rail.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
