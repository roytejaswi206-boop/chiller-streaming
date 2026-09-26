"use client";

import React, { useState, useEffect } from "react";

export default function AdminCachePage() {
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [clearingNs, setClearingNs] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

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

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to flush the entire in-memory discovery cache?")) {
      return;
    }
    setClearing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_cache" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: `✓ ${data.message || "Cache successfully purged."}`, type: "success" });
        loadStats();
      } else {
        setMsg({ text: data.error || "Failed to purge cache.", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setClearing(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleClearNamespace = async (namespace: string) => {
    setClearingNs(namespace);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_namespace", namespace }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: `✓ ${data.message || `Namespace ${namespace} cleared.`}`, type: "success" });
        loadStats();
      } else {
        setMsg({ text: data.error || "Failed to clear namespace.", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setClearingNs(null);
      setTimeout(() => setMsg(null), 4000);
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
            Monitor real-time hit/miss rates, active cache keys, TTL tiers, and purge namespaces on demand.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadStats}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition cursor-pointer"
          >
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="px-5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
          >
            {clearing ? "Flushing..." : "🗑️ Flush All Discovery Cache"}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
          }`}
        >
          <span>{msg.type === "success" ? "✓" : "⚠️"}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Cache Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Cached Keys
          </span>
          <span className="text-2xl font-black text-white font-mono">
            {cacheStats?.size ?? 0}
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">Active response entries in memory</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Cache Hits
          </span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            {cacheStats?.hits ?? 0}
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">Served without API roundtrip</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Cache Misses
          </span>
          <span className="text-2xl font-black text-amber-400 font-mono">
            {cacheStats?.misses ?? 0}
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
          <p className="text-[11px] text-zinc-500 mt-2">Cache efficiency score</p>
        </div>
      </div>

      {/* Purge Namespace Operations */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">Targeted Namespace Purge</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Purge specific cache partitions without invalidating unrelated catalog queries.
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Last Purge: {cacheStats?.lastPurge || "None"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[
            { label: "Trending Rail", ns: "trending" },
            { label: "Movies Catalog", ns: "movies" },
            { label: "Series Catalog", ns: "series" },
            { label: "Anime Catalog", ns: "anime" },
          ].map((item) => (
            <button
              key={item.ns}
              onClick={() => handleClearNamespace(item.ns)}
              disabled={clearingNs === item.ns}
              className="p-3.5 rounded-xl border border-white/10 bg-black/40 hover:bg-white/10 text-left transition cursor-pointer disabled:opacity-50"
            >
              <span className="text-xs font-bold text-white block">{item.label}</span>
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
                {clearingNs === item.ns ? "Flushing..." : "Purge Namespace ⚡"}
              </span>
            </button>
          ))}
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
