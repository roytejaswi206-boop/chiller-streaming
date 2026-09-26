"use client";

import React, { useState, useEffect, useCallback } from "react";

interface TimePoint {
  timestamp: string;
  label: string;
  visitors: number;
  pageViews: number;
  sessions: number;
  watchStarts: number;
  watchSeconds: number;
  registrations: number;
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<"today" | "yesterday" | "7d" | "14d" | "30d" | "90d">("7d");
  const [selectedMetric, setSelectedMetric] = useState<
    "visitors" | "pageViews" | "sessions" | "watchStarts" | "watchSeconds" | "registrations"
  >("visitors");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async (r: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/overview?range=${r}`);
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(range);
  }, [range, fetchAnalytics]);

  const points: TimePoint[] = analytics?.timeSeries || [];
  const currentMetricValues = points.map((p) => p[selectedMetric]);
  const totalVal = currentMetricValues.reduce((a, b) => a + b, 0);
  const peakVal = currentMetricValues.length > 0 ? Math.max(...currentMetricValues) : 0;
  const avgVal = currentMetricValues.length > 0 ? Math.round(totalVal / currentMetricValues.length) : 0;

  const metricLabels: Record<string, string> = {
    visitors: "Unique Visitors",
    pageViews: "Page Views",
    sessions: "Session Count",
    watchStarts: "Playback Starts",
    watchSeconds: "Watch Time (Seconds)",
    registrations: "New Registrations",
  };

  const formatSecs = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${sec % 60}s`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
            Platform Telemetry
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Traffic & Audience Analytics
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real first-party audience metrics, retention trends, and hourly/daily playback telemetry.
          </p>
        </div>

        {/* Range Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
          {(["today", "yesterday", "7d", "14d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                range === r ? "bg-[#FF3B6B] text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {r === "today"
                ? "Today"
                : r === "yesterday"
                ? "Yesterday"
                : r === "7d"
                ? "7 Days"
                : r === "14d"
                ? "14 Days"
                : r === "30d"
                ? "30 Days"
                : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metric Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(
          [
            { key: "visitors", label: "Visitors", val: analytics?.kpi.visitors.current ?? 0 },
            { key: "pageViews", label: "Page Views", val: analytics?.kpi.pageViews.current ?? 0 },
            { key: "sessions", label: "Sessions", val: analytics?.kpi.sessions.current ?? 0 },
            { key: "watchStarts", label: "Watch Starts", val: analytics?.kpi.watchStarts.current ?? 0 },
            {
              key: "watchSeconds",
              label: "Watch Time",
              val: analytics?.kpi.watchTimeFormatted || "0h 0m",
            },
            { key: "registrations", label: "Registrations", val: analytics?.kpi.registrations.current ?? 0 },
          ] as const
        ).map((m) => (
          <button
            key={m.key}
            onClick={() => setSelectedMetric(m.key as any)}
            className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
              selectedMetric === m.key
                ? "border-[#FF3B6B] bg-[#FF3B6B]/10 shadow-lg shadow-[#FF3B6B]/15"
                : "border-white/10 bg-[#12121a] hover:bg-white/5"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              {m.label}
            </span>
            <span className="text-xl font-black text-white font-mono block">{m.val}</span>
            <span className="text-[10px] text-zinc-500 mt-1 block">Click to chart</span>
          </button>
        ))}
      </div>

      {/* Main Interactive Chart Section */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">
              {metricLabels[selectedMetric]} Over Time
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Aggregated across {points.length} intervals for the selected period
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Total</span>
              <span className="text-white font-bold">
                {selectedMetric === "watchSeconds" ? formatSecs(totalVal) : totalVal}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Average / Point</span>
              <span className="text-white font-bold">
                {selectedMetric === "watchSeconds" ? formatSecs(avgVal) : avgVal}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Peak</span>
              <span className="text-emerald-400 font-bold">
                {selectedMetric === "watchSeconds" ? formatSecs(peakVal) : peakVal}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Chart */}
        {loading ? (
          <div className="py-24 text-center text-xs text-zinc-500">Loading timeline telemetry...</div>
        ) : points.length === 0 ? (
          <div className="py-24 text-center text-xs text-zinc-500">
            No telemetry records found for this period.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-60 flex items-end gap-1.5 sm:gap-2 pt-8 px-2">
              {points.map((p, idx) => {
                const val = p[selectedMetric];
                const heightPct = peakVal > 0 ? Math.max(5, Math.min(100, (val / peakVal) * 100)) : 5;
                return (
                  <div
                    key={idx}
                    className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  >
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/95 border border-white/20 px-2.5 py-1 rounded text-[11px] text-white font-mono whitespace-nowrap z-30 shadow-xl">
                      {p.label}: {selectedMetric === "watchSeconds" ? formatSecs(val) : val}
                    </div>
                    <div
                      className="w-full rounded-t transition-all group-hover:brightness-125"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: "#FF3B6B",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-white/5 px-2">
              <span>{points[0]?.label}</span>
              <span>{points[Math.floor(points.length / 2)]?.label}</span>
              <span>{points[points.length - 1]?.label}</span>
            </div>
          </div>
        )}
      </div>

      {/* CSV Export Bar */}
      <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white">Data Export & Verification</h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Download raw database event records for independent audit and compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open("/api/admin/analytics/export?type=visitors", "_blank")}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-bold border border-white/10 cursor-pointer"
          >
            Export Visitors CSV
          </button>
          <button
            onClick={() => window.open("/api/admin/analytics/export?type=watch", "_blank")}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-bold border border-white/10 cursor-pointer"
          >
            Export Watch Time CSV
          </button>
        </div>
      </div>
    </div>
  );
}
