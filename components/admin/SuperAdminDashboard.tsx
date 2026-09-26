"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface MetricComp {
  current: number;
  previous: number;
  changePct: number | null;
  trend: "up" | "down" | "flat" | "none";
}

interface AnalyticsData {
  range: string;
  startDate: string;
  endDate: string;
  updatedAt: string;
  live: {
    activeVisitorsNow: number;
    activeWatchNow: number;
  };
  kpi: {
    visitors: MetricComp;
    pageViews: MetricComp;
    sessions: MetricComp;
    watchTimeSeconds: MetricComp;
    watchTimeFormatted: string;
    avgSessionFormatted: string;
    watchStarts: MetricComp;
    registrations: MetricComp;
    logins: MetricComp;
    searches: MetricComp;
    playbackSuccessRate: MetricComp;
    playbackErrors: MetricComp;
    systemErrors: MetricComp;
  };
  timeSeries: Array<{
    timestamp: string;
    label: string;
    visitors: number;
    pageViews: number;
    sessions: number;
    watchStarts: number;
    watchSeconds: number;
    registrations: number;
  }>;
  content: {
    topMovies: Array<{ id: string; title: string; views: number; watchSeconds: number }>;
    topTV: Array<{ id: string; title: string; views: number; watchSeconds: number }>;
    topAnime: Array<{ id: string; title: string; views: number; watchSeconds: number }>;
  };
  users: {
    total: number;
    withWatchlist: number;
    withHistory: number;
  };
}

interface LiveEvent {
  id: string;
  type: string;
  description: string;
  actor: string;
  timestamp: string;
  device?: string;
}

interface PlaybackHealth {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  overallSuccessRate: number | null;
  generalPool: Array<{ id: string; name: string; status: string; successRate: number | null; totalAttempts: number }>;
  animePool: Array<{ id: string; name: string; status: string; successRate: number | null; totalAttempts: number }>;
}

export function SuperAdminDashboard() {
  const [range, setRange] = useState<"today" | "yesterday" | "7d" | "30d" | "90d">("today");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [playbackHealth, setPlaybackHealth] = useState<PlaybackHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMetricTab, setActiveMetricTab] = useState<"visitors" | "pageViews" | "watchStarts" | "watchSeconds">("visitors");

  const loadData = useCallback(async (selectedRange: string) => {
    try {
      setRefreshing(true);
      const [anRes, liveRes, playRes] = await Promise.all([
        fetch(`/api/admin/analytics/overview?range=${selectedRange}`),
        fetch(`/api/admin/analytics/live?limit=15`),
        fetch(`/api/admin/analytics/playback`),
      ]);

      if (anRes.ok) {
        const json = await anRes.json();
        if (json.success) setAnalytics(json);
      }
      if (liveRes.ok) {
        const json = await liveRes.json();
        if (json.success) setLiveEvents(json.events || []);
      }
      if (playRes.ok) {
        const json = await playRes.json();
        if (json.success) setPlaybackHealth(json);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(range);
    // Poll live presence & activity every 20 seconds
    const interval = setInterval(() => loadData(range), 20000);
    return () => clearInterval(interval);
  }, [range, loadData]);

  const handleExportCsv = (type: string) => {
    window.open(`/api/admin/analytics/export?type=${type}`, "_blank");
  };

  const formatSecs = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${sec % 60}s`;
  };

  const renderComparisonTag = (comp?: MetricComp, unit: string = "") => {
    if (!comp) return null;
    if (comp.changePct === null) {
      return (
        <span className="text-[10px] text-zinc-500 font-mono">
          No comparison data
        </span>
      );
    }
    const isPositive = comp.changePct >= 0;
    return (
      <span
        className={`text-[11px] font-bold font-mono flex items-center gap-0.5 ${
          isPositive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        <span>{isPositive ? "↑" : "↓"}</span>
        <span>{Math.abs(comp.changePct)}%</span>
        <span className="text-[9px] text-zinc-500 font-normal">
          vs {range === "today" ? "yesterday" : "prev period"}
        </span>
      </span>
    );
  };

  const maxChartValue = Math.max(
    ...(analytics?.timeSeries?.map((p) => p[activeMetricTab]) || [1]),
    1
  );

  return (
    <div className="space-y-8">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
              CHILLER SUPER ADMIN
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE ● {analytics?.live.activeVisitorsNow ?? 0} ACTIVE NOW
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Production Intelligence & Control Center
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Authoritative, zero-mock streaming telemetry, visitor presence, watch time, and routing pools.
          </p>
        </div>

        {/* Date Filters & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl">
            {(["today", "yesterday", "7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  range === r
                    ? "bg-[#FF3B6B] text-white shadow-md shadow-[#FF3B6B]/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {r === "today"
                  ? "Today"
                  : r === "yesterday"
                  ? "Yesterday"
                  : r === "7d"
                  ? "7D"
                  : r === "30d"
                  ? "30D"
                  : "90D"}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadData(range)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition border border-white/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className={refreshing ? "animate-spin" : ""}>🔄</span>
            <span>{refreshing ? "Updating..." : "Refresh"}</span>
          </button>

          <div className="relative group">
            <button className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
              <span>📥 Export CSV</span>
              <span>▾</span>
            </button>
            <div className="absolute right-0 mt-1 w-44 rounded-xl bg-[#12121a] border border-white/10 shadow-2xl p-1 hidden group-hover:block z-50">
              <button
                onClick={() => handleExportCsv("visitors")}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg"
              >
                Visitors & Sessions
              </button>
              <button
                onClick={() => handleExportCsv("watch")}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg"
              >
                Watch Telemetry
              </button>
              <button
                onClick={() => handleExportCsv("searches")}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg"
              >
                Search Queries
              </button>
              <button
                onClick={() => handleExportCsv("playback")}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg"
              >
                Playback Attempts
              </button>
              <button
                onClick={() => handleExportCsv("errors")}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg"
              >
                Error Center Logs
              </button>
              <button
                onClick={() => handleExportCsv("users")}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg"
              >
                Registered Users
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOP KPI CARDS (Phase 4, Phase 29) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Visitors */}
        <Link
          href="/admin/analytics"
          className="p-4 rounded-2xl border border-white/10 bg-[#12121a] hover:border-[#FF3B6B]/40 transition group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Visitors {range === "today" ? "Today" : ""}
          </span>
          <span className="text-xl sm:text-2xl font-black text-white font-mono block">
            {analytics?.kpi.visitors.current ?? 0}
          </span>
          <div className="mt-1.5">{renderComparisonTag(analytics?.kpi.visitors)}</div>
        </Link>

        {/* Page Views */}
        <Link
          href="/admin/analytics"
          className="p-4 rounded-2xl border border-white/10 bg-[#12121a] hover:border-[#FF3B6B]/40 transition group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Page Views {range === "today" ? "Today" : ""}
          </span>
          <span className="text-xl sm:text-2xl font-black text-white font-mono block">
            {analytics?.kpi.pageViews.current ?? 0}
          </span>
          <div className="mt-1.5">{renderComparisonTag(analytics?.kpi.pageViews)}</div>
        </Link>

        {/* Watch Time */}
        <Link
          href="/admin/analytics"
          className="p-4 rounded-2xl border border-white/10 bg-[#12121a] hover:border-[#FF3B6B]/40 transition group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Watch Time
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono block">
            {analytics?.kpi.watchTimeFormatted || "0h 0m"}
          </span>
          <div className="mt-1.5">{renderComparisonTag(analytics?.kpi.watchTimeSeconds)}</div>
        </Link>

        {/* New Registrations */}
        <Link
          href="/admin/users"
          className="p-4 rounded-2xl border border-white/10 bg-[#12121a] hover:border-[#FF3B6B]/40 transition group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Registrations
          </span>
          <span className="text-xl sm:text-2xl font-black text-sky-400 font-mono block">
            {analytics?.kpi.registrations.current ?? 0}
          </span>
          <div className="mt-1.5">{renderComparisonTag(analytics?.kpi.registrations)}</div>
        </Link>

        {/* Active Users Now */}
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Active Now
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono block">
            {analytics?.live.activeVisitorsNow ?? 0}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-1.5">
            {analytics?.live.activeWatchNow ?? 0} in playback
          </span>
        </div>

        {/* Watch Starts */}
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Watch Starts
          </span>
          <span className="text-xl sm:text-2xl font-black text-white font-mono block">
            {analytics?.kpi.watchStarts.current ?? 0}
          </span>
          <div className="mt-1.5">{renderComparisonTag(analytics?.kpi.watchStarts)}</div>
        </div>

        {/* Playback Success Rate */}
        <Link
          href="/admin/playback-lab/general"
          className="p-4 rounded-2xl border border-white/10 bg-[#12121a] hover:border-[#FF3B6B]/40 transition group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Stream Success
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono block">
            {playbackHealth?.overallSuccessRate !== null && playbackHealth?.overallSuccessRate !== undefined
              ? `${playbackHealth.overallSuccessRate}%`
              : "No data"}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-1.5">
            {playbackHealth?.totalAttempts ?? 0} attempts
          </span>
        </Link>

        {/* Playback Errors */}
        <Link
          href="/admin/errors"
          className="p-4 rounded-2xl border border-white/10 bg-[#12121a] hover:border-[#FF3B6B]/40 transition group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Stream Errors
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono block">
            {analytics?.kpi.playbackErrors.current ?? 0}
          </span>
          <div className="mt-1.5">{renderComparisonTag(analytics?.kpi.playbackErrors)}</div>
        </Link>
      </div>

      {/* Traffic Trend Card (Phase 6) */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between justify-center text-lg shrink-0">
            📈
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Traffic Trend Analysis</h3>
              {analytics?.kpi.visitors.changePct !== null && analytics?.kpi.visitors.changePct !== undefined ? (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    analytics.kpi.visitors.changePct >= 0
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {analytics.kpi.visitors.changePct >= 0 ? "↑ Increasing" : "↓ Decreasing"}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-zinc-400">
                  Baseline Period
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Current period: <strong className="text-white font-mono">{analytics?.kpi.visitors.current ?? 0}</strong> visitors •
              Previous period: <strong className="text-zinc-300 font-mono">{analytics?.kpi.visitors.previous ?? 0}</strong> visitors
              {analytics?.kpi.visitors.changePct !== null && analytics?.kpi.visitors.changePct !== undefined && (
                <span> ({analytics.kpi.visitors.changePct >= 0 ? "+" : ""}{analytics.kpi.visitors.changePct}%)</span>
              )}
            </p>
          </div>
        </div>

        <div className="text-right flex items-center gap-4">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Avg Session Duration</span>
            <span className="text-sm font-bold text-white font-mono">
              {analytics?.kpi.avgSessionFormatted || "0m 0s"}
            </span>
          </div>
        </div>
      </div>

      {/* Traffic Time-Series Chart (Phase 5) */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Platform Traffic & Playback Over Time</h3>
            <p className="text-xs text-zinc-400">
              Aggregated {analytics?.range === "today" || analytics?.range === "yesterday" ? "hourly" : "daily"} telemetry points
            </p>
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            {(
              [
                { key: "visitors", label: "Visitors" },
                { key: "pageViews", label: "Page Views" },
                { key: "watchStarts", label: "Watch Starts" },
                { key: "watchSeconds", label: "Watch Time" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveMetricTab(t.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  activeMetricTab === t.key
                    ? "bg-[#FF3B6B] text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Render */}
        {!analytics?.timeSeries || analytics.timeSeries.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            No telemetry data recorded in this period yet.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-44 flex items-end gap-1.5 sm:gap-2 pt-6 px-1">
              {analytics.timeSeries.map((point, idx) => {
                const val = point[activeMetricTab];
                const heightPct = maxChartValue > 0 ? Math.max(4, Math.min(100, (val / maxChartValue) * 100)) : 4;
                return (
                  <div
                    key={idx}
                    className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  >
                    {/* Hover tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/90 border border-white/20 px-2 py-1 rounded text-[10px] text-white font-mono whitespace-nowrap z-30 shadow-lg">
                      {point.label}: {activeMetricTab === "watchSeconds" ? formatSecs(val) : val}
                    </div>
                    <div
                      className="w-full rounded-t transition-all group-hover:brightness-125"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor:
                          activeMetricTab === "visitors"
                            ? "#FF3B6B"
                            : activeMetricTab === "pageViews"
                            ? "#8A5CFF"
                            : activeMetricTab === "watchStarts"
                            ? "#10B981"
                            : "#F59E0B",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Labels */}
            <div className="flex justify-between text-[9px] font-mono text-zinc-500 pt-1 border-t border-white/5 px-1">
              <span>{analytics.timeSeries[0]?.label}</span>
              <span>{analytics.timeSeries[Math.floor(analytics.timeSeries.length / 2)]?.label}</span>
              <span>{analytics.timeSeries[analytics.timeSeries.length - 1]?.label}</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Content Grid (Phase 11) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Movies */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🎬</span> Top Movies
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">By Views</span>
          </div>

          {!analytics?.content.topMovies || analytics.content.topMovies.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No movie playback recorded in range.</p>
          ) : (
            <div className="space-y-2.5">
              {analytics.content.topMovies.map((m, idx) => (
                <div key={m.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="font-mono text-zinc-500 font-bold w-4">#{idx + 1}</span>
                    <span className="font-bold text-white truncate max-w-[150px]">{m.title}</span>
                  </div>
                  <div className="text-right font-mono text-[11px] shrink-0">
                    <span className="text-rose-400 font-bold block">{m.views} views</span>
                    <span className="text-zinc-500 text-[10px]">{formatSecs(m.watchSeconds)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Anime */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>⚔️</span> Top Anime
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">Dedicated Pool</span>
          </div>

          {!analytics?.content.topAnime || analytics.content.topAnime.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No anime playback recorded in range.</p>
          ) : (
            <div className="space-y-2.5">
              {analytics.content.topAnime.map((a, idx) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="font-mono text-zinc-500 font-bold w-4">#{idx + 1}</span>
                    <span className="font-bold text-white truncate max-w-[150px]">{a.title}</span>
                  </div>
                  <div className="text-right font-mono text-[11px] shrink-0">
                    <span className="text-purple-400 font-bold block">{a.views} views</span>
                    <span className="text-zinc-500 text-[10px]">{formatSecs(a.watchSeconds)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top TV Series */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📺</span> Top Series
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">By Views</span>
          </div>

          {!analytics?.content.topTV || analytics.content.topTV.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No series playback recorded in range.</p>
          ) : (
            <div className="space-y-2.5">
              {analytics.content.topTV.map((t, idx) => (
                <div key={t.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="font-mono text-zinc-500 font-bold w-4">#{idx + 1}</span>
                    <span className="font-bold text-white truncate max-w-[150px]">{t.title}</span>
                  </div>
                  <div className="text-right font-mono text-[11px] shrink-0">
                    <span className="text-sky-400 font-bold block">{t.views} views</span>
                    <span className="text-zinc-500 text-[10px]">{formatSecs(t.watchSeconds)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Split Bottom Row: Live Activity & Playback Health (Phase 7, 16, 30) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Activity Stream */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-sm font-bold text-white">Live Platform Activity</h3>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Real-time Stream</span>
          </div>

          {liveEvents.length === 0 ? (
            <p className="text-xs text-zinc-500 py-8 text-center">Awaiting incoming visitor activity...</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-80 pr-1">
              {liveEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs gap-3"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-sm">
                      {evt.type === "WATCH_START"
                        ? "▶️"
                        : evt.type === "PAGE_VIEW"
                        ? "👁️"
                        : evt.type === "SEARCH"
                        ? "🔍"
                        : evt.type === "REGISTRATION"
                        ? "👤"
                        : "⚠️"}
                    </span>
                    <div className="truncate">
                      <p className="text-zinc-200 font-medium truncate">{evt.description}</p>
                      <span className="text-[10px] text-zinc-500 font-mono">{evt.actor}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dual-Pool Playback Health */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Playback & Routing Health</h3>
              <p className="text-[11px] text-zinc-400">
                Isolated General & Dedicated Anime resolver pools
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {playbackHealth?.overallSuccessRate !== null && playbackHealth?.overallSuccessRate !== undefined
                ? `${playbackHealth.overallSuccessRate}% Success`
                : "No data"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="text-zinc-200">🎬 General Pool</span>
                <span className="text-emerald-400 font-mono">
                  {playbackHealth?.generalPool.filter((p) => p.status === "ACTIVE" || p.status === "CONFIGURED").length || 0} active
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Providers for Movies, TV shows, and Documentaries.
              </p>
              <div className="pt-1">
                <Link
                  href="/admin/playback-lab/general"
                  className="text-[11px] font-bold text-[#FF3B6B] hover:underline"
                >
                  Configure General Pool →
                </Link>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="text-zinc-200">⚔️ Anime Pool</span>
                <span className="text-purple-400 font-mono">
                  {playbackHealth?.animePool.filter((p) => p.status === "ACTIVE" || p.status === "CONFIGURED").length || 0} active
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Isolated dedicated anime providers & AniList sync.
              </p>
              <div className="pt-1">
                <Link
                  href="/admin/playback-lab/anime"
                  className="text-[11px] font-bold text-[#FF3B6B] hover:underline"
                >
                  Configure Anime Pool →
                </Link>
              </div>
            </div>
          </div>

          {/* Subsystem Quick Links */}
          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <Link href="/admin/providers" className="text-zinc-400 hover:text-white transition">
              🔌 All Providers ({playbackHealth?.generalPool.length ?? 0 + (playbackHealth?.animePool.length ?? 0)})
            </Link>
            <Link href="/admin/intelligence" className="text-zinc-400 hover:text-white transition">
              🧠 Routing Brain
            </Link>
            <Link href="/admin/health" className="text-zinc-400 hover:text-white transition">
              🩺 Subsystem Health
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
