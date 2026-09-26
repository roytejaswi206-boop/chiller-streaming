"use client";

import { useEffect, useState, useCallback } from "react";

interface SuperAdminStats {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersNow: number;
  totalVisits: number;
  visitsToday: number;
  totalWatchSessions: number;
  watchSessionsToday: number;
  totalContentViews: number;
  mobileUsers: number;
  desktopUsers: number;
  last24Hours: Array<{ label: string; timestamp: number; visits: number; watches: number }>;
  last7Days: Array<{ date: string; label: string; visits: number }>;
  updatedAt: string;
}

export function UsageActivitySection() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchStats = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        throw new Error(`Failed to load stats (${res.status})`);
      }
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load usage statistics");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Poll every 30 seconds while on the admin page
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const max24h = Math.max(
    ...(stats?.last24Hours.map((h) => Math.max(h.visits, h.watches)) || [1]),
    1
  );

  const max7d = Math.max(
    ...(stats?.last7Days.map((d) => d.visits) || [1]),
    1
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
              TELEMETRY & AUDIT
            </span>
            <span className="text-xs font-bold text-white tracking-tight">
              Usage & Activity
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Real-time aggregate platform audience, session presence, and playback telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {stats?.updatedAt && (
            <span className="text-[11px] text-zinc-500 font-mono">
              Updated: {new Date(stats.updatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchStats()}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 text-xs font-semibold text-zinc-200 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className={`inline-block ${isRefreshing ? "animate-spin" : ""}`}>🔄</span>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FF3B6B] animate-ping" />
          Loading platform metrics...
        </div>
      ) : error && !stats ? (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs text-rose-300">
          {error}
        </div>
      ) : stats ? (
        <>
          {/* Main 6 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. TOTAL USERS */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  TOTAL USERS
                </span>
                <span className="text-2xl font-black text-white">{stats.totalUsers}</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-2 font-medium">
                {stats.activeUsersToday} active today
              </p>
            </div>

            {/* 2. ACTIVE NOW */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    ACTIVE NOW
                  </span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <span className="text-2xl font-black text-emerald-400">
                  {stats.activeUsersNow}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-2 font-medium">
                Last 5 minutes
              </p>
            </div>

            {/* 3. TODAY'S VISITS */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  TODAY&apos;S VISITS
                </span>
                <span className="text-2xl font-black text-white">{stats.visitsToday}</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">
                Total: <span className="text-zinc-200 font-semibold">{stats.totalVisits}</span>
              </p>
            </div>

            {/* 4. TOTAL VIEWS */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  TOTAL VIEWS
                </span>
                <span className="text-2xl font-black text-[#FF3B6B]">
                  {stats.totalContentViews}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-2 font-medium">
                Content views
              </p>
            </div>

            {/* 5. WATCH SESSIONS */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  WATCH SESSIONS
                </span>
                <span className="text-2xl font-black text-[#8A5CFF]">
                  {stats.totalWatchSessions}
                </span>
              </div>
              <p className="text-[11px] text-purple-300 mt-2 font-medium">
                {stats.watchSessionsToday} sessions today
              </p>
            </div>

            {/* 6. MOBILE / DESKTOP */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  MOBILE / DESKTOP
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-sky-400">{stats.mobileUsers}</span>
                  <span className="text-xs text-zinc-600 font-bold">/</span>
                  <span className="text-lg font-black text-emerald-400">{stats.desktopUsers}</span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2">
                📱 {stats.mobileUsers} • 💻 {stats.desktopUsers}
              </p>
            </div>
          </div>

          {/* Activity Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Activity — Last 24 Hours */}
            <div className="p-4 rounded-xl border border-white/5 bg-black/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Activity — Last 24 Hours</h4>
                  <p className="text-[10px] text-zinc-500">Hourly site visits and media watch events</p>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-sky-400" />
                    <span className="text-zinc-400">Visits</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-[#FF3B6B]" />
                    <span className="text-zinc-400">Watch</span>
                  </div>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="h-32 flex items-end gap-1 pt-4 pb-1 px-1">
                {stats.last24Hours.map((hour, idx) => {
                  const visitHeightPercent = Math.max((hour.visits / max24h) * 100, 4);
                  const watchHeightPercent = Math.max((hour.watches / max24h) * 100, 4);

                  return (
                    <div
                      key={idx}
                      className="flex-1 h-full flex flex-col justify-end items-center gap-0.5 group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                        <div className="px-2 py-1 rounded bg-[#1e1e2d] border border-white/20 text-[10px] text-white whitespace-nowrap shadow-xl">
                          <span className="font-bold">{hour.label}</span>: {hour.visits} visits, {hour.watches} watches
                        </div>
                        <div className="w-1.5 h-1.5 bg-[#1e1e2d] rotate-45 border-r border-b border-white/20 -mt-1"></div>
                      </div>

                      {/* Watch Bar */}
                      {hour.watches > 0 && (
                        <div
                          style={{ height: `${watchHeightPercent}%` }}
                          className="w-full rounded-t-sm bg-gradient-to-t from-[#FF3B6B]/60 to-[#FF3B6B] transition-all"
                        />
                      )}

                      {/* Visit Bar */}
                      <div
                        style={{ height: `${visitHeightPercent}%` }}
                        className={`w-full rounded-t-sm transition-all ${
                          hour.visits > 0
                            ? "bg-gradient-to-t from-sky-600/70 to-sky-400"
                            : "bg-white/5"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Time axis labels */}
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono px-1 border-t border-white/5 pt-1.5">
                <span>24h ago</span>
                <span>12h ago</span>
                <span>Now</span>
              </div>
            </div>

            {/* Chart 2: Visitors — Last 7 Days */}
            <div className="p-4 rounded-xl border border-white/5 bg-black/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Visitors — Last 7 Days</h4>
                  <p className="text-[10px] text-zinc-500">Daily unique/session site visits</p>
                </div>
                <span className="text-[11px] font-bold text-emerald-400">
                  {stats.last7Days.reduce((acc, d) => acc + d.visits, 0)} Total
                </span>
              </div>

              {/* Day bars */}
              <div className="h-32 flex items-end gap-2 pt-4 pb-1 px-1">
                {stats.last7Days.map((day, idx) => {
                  const heightPercent = Math.max((day.visits / max7d) * 100, 6);

                  return (
                    <div
                      key={idx}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                        <div className="px-2 py-0.5 rounded bg-[#1e1e2d] border border-white/20 text-[10px] text-white whitespace-nowrap shadow-xl">
                          <span className="font-bold">{day.label}</span>: {day.visits} visits
                        </div>
                        <div className="w-1.5 h-1.5 bg-[#1e1e2d] rotate-45 border-r border-b border-white/20 -mt-1"></div>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all ${
                          day.visits > 0
                            ? "bg-gradient-to-t from-emerald-600/70 to-emerald-400 group-hover:brightness-125"
                            : "bg-white/5"
                        }`}
                      />
                      <span className="text-[9px] text-zinc-500 font-mono mt-1.5">
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Sub-label */}
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono px-1 border-t border-white/5 pt-1.5">
                <span>7 Days Ago</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
