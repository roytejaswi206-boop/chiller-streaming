"use client";

import React, { useState, useEffect } from "react";

export default function AdminSearchAnalyticsPage() {
  const [range, setRange] = useState<"today" | "7d" | "30d">("today");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSearchAnalytics = async (selectedRange: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/search-analytics?range=${selectedRange}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearchAnalytics(range);
  }, [range]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20">
            Discovery Intelligence
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Search Analytics & Discovery Demand
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor real search events, popular keywords, zero-result discovery gaps, and catalog interest.
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                range === r
                  ? "bg-[#FF3B6B] text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {r === "today" ? "Today" : r === "7d" ? "Last 7 Days" : "Last 30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Total Queries
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {data?.totalSearches ?? 0}
            </span>
            {data?.comparison?.changePct !== null && data?.comparison?.changePct !== undefined ? (
              <span
                className={`text-xs font-bold ${
                  data.comparison.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {data.comparison.changePct >= 0 ? "↑" : "↓"} {Math.abs(data.comparison.changePct)}%
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500">No comparison data</span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Real user search events in period</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Zero-Result Queries
          </span>
          <span className="text-2xl font-black text-rose-400 font-mono">
            {data?.zeroResultCount ?? 0}
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">Searches yielding no catalog items</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Top Search Query
          </span>
          <span className="text-xl font-black text-[#FF3B6B] truncate block">
            {data?.topSearches?.[0] ? data.topSearches[0].query : "No data available yet"}
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">
            {data?.topSearches?.[0]
              ? `${data.topSearches[0].count} query requests`
              : "Awaiting search traffic"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Search Queries Table */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white">Most Searched Terms</h3>
          {loading ? (
            <p className="text-xs text-zinc-500 py-6 text-center">Loading search terms...</p>
          ) : !data?.topSearches || data.topSearches.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No search telemetry recorded yet in this range.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {data.topSearches.map((item: any, idx: number) => (
                <div key={item.query} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-mono text-zinc-500 font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-white font-semibold font-mono">{item.query}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {item.resultCount} results
                    </span>
                    <span className="text-zinc-300 font-mono font-bold">{item.count} searches</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zero-Result Queries Table */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Zero-Result Discovery Gaps</h3>
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
              Content Gaps
            </span>
          </div>
          {loading ? (
            <p className="text-xs text-zinc-500 py-6 text-center">Loading search terms...</p>
          ) : !data?.zeroResultQueries || data.zeroResultQueries.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">✓ Zero zero-result queries recorded.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {data.zeroResultQueries.map((item: any, idx: number) => (
                <div key={item.query} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-mono text-rose-400 font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-zinc-300 font-mono">{item.query}</span>
                  </div>
                  <span className="text-rose-400 font-mono font-bold">{item.count} misses</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
