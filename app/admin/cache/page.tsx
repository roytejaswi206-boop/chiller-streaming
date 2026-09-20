"use client";

import React, { useState, useEffect } from "react";

export default function AdminCachePage() {
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [msg, setMsg] = useState("");

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/diagnostics");
      if (res.ok) {
        const json = await res.json();
        setCacheStats(json.cache);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClear = async () => {
    setClearing(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_cache" }),
      });
      if (res.ok) {
        setMsg("✓ In-memory discovery cache successfully cleared.");
        loadStats();
      }
    } catch {
      setMsg("Failed to flush cache.");
    } finally {
      setClearing(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
            Performance Acceleration
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Cache Management & In-Memory Store
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor TTL classes, cache hit/miss ratio, and flush cached discovery responses.
          </p>
        </div>

        <button
          onClick={handleClear}
          disabled={clearing}
          className="px-5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
        >
          {clearing ? "Flushing..." : "🗑️ Flush All Discovery Cache"}
        </button>
      </div>

      {msg && <p className="text-xs font-bold text-emerald-400">{msg}</p>}

      {/* Cache Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Cached Keys
          </span>
          <span className="text-2xl font-black text-white font-mono">
            {cacheStats?.size || 0}
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">Active response entries</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Cache Hits
          </span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            {cacheStats?.hits || 0}
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">Served without API roundtrip</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Cache Misses
          </span>
          <span className="text-2xl font-black text-amber-400 font-mono">
            {cacheStats?.misses || 0}
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">Fetched from upstream provider</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Hit Ratio
          </span>
          <span className="text-2xl font-black text-[#FF3B6B] font-mono">
            {cacheStats?.hitRatio || "0%"}
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">Efficiency percentage</p>
        </div>
      </div>

      {/* TTL Policies Reference Card */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 space-y-4">
        <h3 className="text-sm font-bold text-white">Tiered Cache TTL Policies</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-rose-400 uppercase">Trending Titles</span>
            <p className="font-mono text-white text-sm">5 Minutes</p>
            <p className="text-[11px] text-zinc-500">Fast updates for viral shifts</p>
          </div>
          <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-sky-400 uppercase">Popular & Airing</span>
            <p className="font-mono text-white text-sm">10 Minutes</p>
            <p className="text-[11px] text-zinc-500">Frequent updates for broadcasts</p>
          </div>
          <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-purple-400 uppercase">Genres & Regional</span>
            <p className="font-mono text-white text-sm">30 Minutes</p>
            <p className="text-[11px] text-zinc-500">Balanced catalog freshness</p>
          </div>
          <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Static Metadata</span>
            <p className="font-mono text-white text-sm">60 Minutes</p>
            <p className="text-[11px] text-zinc-500">Longer lifespan for stable details</p>
          </div>
        </div>
      </div>
    </div>
  );
}
