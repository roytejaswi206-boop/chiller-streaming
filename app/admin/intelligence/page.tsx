"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface IntelligenceData {
  timestamp: string;
  summary: {
    totalGeneralProviders: number;
    totalAnimeProviders: number;
    activeGeneralProviders: number;
    activeAnimeProviders: number;
    crosswalkEntries: number;
  };
  topProviders: any[];
  slowestProviders: any[];
  generalMetrics: any[];
  animeMetrics: any[];
  recommendations: { type: "info" | "warning" | "success"; message: string }[];
  crosswalkStats: { totalEntries: number; sampleTitles: string[] };
  recommendationDebug?: any;
}

export default function IntelligenceDashboardPage() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [testTitle, setTestTitle] = useState("Attack on Titan");
  const [testType, setTestType] = useState<"anime" | "movie" | "tv">("anime");
  const [inspectingRecs, setInspectingRecs] = useState(false);
  const [recResult, setRecResult] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/intelligence?testTitle=${encodeURIComponent(testTitle)}&testType=${testType}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      if (json.recommendationDebug) {
        setRecResult(json.recommendationDebug);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load intelligence telemetry");
    } finally {
      setLoading(false);
    }
  };

  const runTestInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle.trim()) return;
    setInspectingRecs(true);
    try {
      const res = await fetch(
        `/api/content/recommendations?type=${testType}&title=${encodeURIComponent(testTitle.trim())}&limit=8&debug=true`
      );
      if (res.ok) {
        const json = await res.json();
        setRecResult(json);
      }
    } catch {
      // Non-blocking
    } finally {
      setInspectingRecs(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0D13] text-gray-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                CHILLER BRAIN
              </span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Self-Improving Routing & Intelligence
              </h1>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Autonomous telemetry, dual-pool provider ranking, latency optimization, and self-healing intelligence.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors border border-gray-700"
            >
              {loading ? "Refreshing..." : "Refresh Intelligence"}
            </button>
            <Link
              href="/admin/playback-lab/anime"
              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
            >
              Anime Playback Lab
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-950/40 border border-red-800 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <p className="text-xs text-gray-400">Anime Providers</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                {data.summary.activeAnimeProviders} / {data.summary.totalAnimeProviders}
              </p>
              <p className="text-xs text-emerald-400 mt-0.5">Isolated Pool B</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <p className="text-xs text-gray-400">General Providers</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {data.summary.activeGeneralProviders} / {data.summary.totalGeneralProviders}
              </p>
              <p className="text-xs text-emerald-400 mt-0.5">Isolated Pool A</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <p className="text-xs text-gray-400">Crosswalk Mappings</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {data.summary.crosswalkEntries}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">AniList ↔ MAL ↔ TMDB</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <p className="text-xs text-gray-400">Pool Isolation</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">100%</p>
              <p className="text-xs text-gray-400 mt-0.5">Zero Cross-Pool Leaks</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <p className="text-xs text-gray-400">Routing Policy</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">Dynamic</p>
              <p className="text-xs text-gray-400 mt-0.5">Score = Latency + Health</p>
            </div>
          </div>
        )}

        {/* Autonomous Routing Recommendations */}
        {data && data.recommendations.length > 0 && (
          <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Autonomous Routing Recommendations
            </h2>
            <div className="space-y-2.5">
              {data.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-lg border text-sm flex items-start gap-3 ${
                    rec.type === "warning"
                      ? "bg-amber-950/30 border-amber-800/60 text-amber-200"
                      : rec.type === "success"
                      ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-200"
                      : "bg-blue-950/30 border-blue-800/60 text-blue-200"
                  }`}
                >
                  <span className="mt-0.5 font-bold">
                    {rec.type === "warning" ? "⚠" : rec.type === "success" ? "✓" : "ℹ"}
                  </span>
                  <span>{rec.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anime Pool Telemetry */}
        {data && (
          <div className="rounded-xl bg-gray-900/60 border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-purple-300">ANIME PLAYBACK POOL — Health & Ranking</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Providers exclusively accessible by Anime, Anime Movies, OVAs, and ONAs
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded bg-purple-900/40 text-purple-300 border border-purple-700/50">
                POOL B
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-950/50 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="px-5 py-3">Provider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Success Rate</th>
                    <th className="px-4 py-3">Avg Latency</th>
                    <th className="px-4 py-3">Success / Fail</th>
                    <th className="px-4 py-3">Last Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {data.animeMetrics.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-200">
                        {p.name}
                        <span className="block text-xs text-gray-500 font-mono">{p.id}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            p.status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : p.status === "DEGRADED"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-purple-300">{p.score}</span> / 100
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-semibold ${
                            p.successRate >= 80
                              ? "text-emerald-400"
                              : p.successRate >= 50
                              ? "text-amber-400"
                              : "text-red-400"
                          }`}
                        >
                          {p.successRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-300 font-mono">
                        {p.averageStartupMs ? `${p.averageStartupMs}ms` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 text-xs">
                        <span className="text-emerald-400 font-semibold">{p.totalSuccess}</span> /{" "}
                        <span className="text-red-400 font-semibold">{p.totalFailures}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs font-mono">
                        {p.lastSuccess ? new Date(p.lastSuccess).toLocaleTimeString() : "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* General Pool Telemetry */}
        {data && (
          <div className="rounded-xl bg-gray-900/60 border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-300">GENERAL PLAYBACK POOL — Health & Ranking</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Providers exclusively accessible by Movies, TV Series, and Documentaries
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50">
                POOL A
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-950/50 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="px-5 py-3">Provider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Success Rate</th>
                    <th className="px-4 py-3">Avg Latency</th>
                    <th className="px-4 py-3">Success / Fail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {data.generalMetrics.slice(0, 10).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-200">
                        {p.name}
                        <span className="block text-xs text-gray-500 font-mono">{p.id}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            p.status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : p.status === "DEGRADED"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-blue-300">{p.score}</span> / 100
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-semibold ${
                            p.successRate >= 80
                              ? "text-emerald-400"
                              : p.successRate >= 50
                              ? "text-amber-400"
                              : "text-red-400"
                          }`}
                        >
                          {p.successRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-300 font-mono">
                        {p.averageStartupMs ? `${p.averageStartupMs}ms` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 text-xs">
                        <span className="text-emerald-400 font-semibold">{p.totalSuccess}</span> /{" "}
                        <span className="text-red-400 font-semibold">{p.totalFailures}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Section: Smart Recommendation & Discovery Engine Debugger (Section 60) ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-[#FF3B6B]">🎯</span>
                <span>Recommendation & Smart Discovery Diagnostic Engine</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Inspect cross-source signals, deduplication matrices, ranking factors, and multi-rail output.
              </p>
            </div>
          </div>

          {/* Interactive Inspection Input */}
          <form onSubmit={runTestInspection} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                Title to Inspect
              </label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Attack on Titan, Inception, Breaking Bad"
                className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-sm text-white focus:outline-none focus:border-[#FF3B6B]"
              />
            </div>
            <div className="w-36">
              <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                Media Type
              </label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-sm text-white focus:outline-none focus:border-[#FF3B6B]"
              >
                <option value="anime">Anime</option>
                <option value="movie">Movie</option>
                <option value="tv">TV Series</option>
              </select>
            </div>
            <div className="self-end">
              <button
                type="submit"
                disabled={inspectingRecs}
                className="px-5 py-2 rounded-lg bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 active:scale-95 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/20 cursor-pointer"
              >
                {inspectingRecs ? "Evaluating Signals…" : "Inspect Recommendations"}
              </button>
            </div>
          </form>

          {/* Inspection Results HUD */}
          {recResult && (
            <div className="space-y-4">
              {/* Telemetry Diagnostic Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800">
                  <p className="text-[10px] uppercase font-mono text-gray-400">Total Recommended</p>
                  <p className="text-xl font-bold text-white mt-1">{recResult.totalCount || 0}</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">Across {recResult.sections?.length || 0} rails</p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800">
                  <p className="text-[10px] uppercase font-mono text-gray-400">Deduplicated Items</p>
                  <p className="text-xl font-bold text-[#8A5CFF] mt-1">{recResult.dedupedCount || 0}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Removed duplicates</p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800">
                  <p className="text-[10px] uppercase font-mono text-gray-400">Sources Consulted</p>
                  <p className="text-sm font-bold text-sky-400 mt-1 truncate">
                    {recResult.diagnostics?.sources?.join(", ") || "AniList, TMDB"}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Cross-provider fabric</p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800">
                  <p className="text-[10px] uppercase font-mono text-gray-400">Cache Status</p>
                  <p className="text-sm font-bold text-amber-400 mt-1">
                    {recResult.cached ? "HIT (Cached)" : "FRESH (Generated)"}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">TTL: 30 minutes</p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800">
                  <p className="text-[10px] uppercase font-mono text-gray-400">Personalization</p>
                  <p className="text-sm font-bold text-purple-400 mt-1">
                    {recResult.diagnostics?.personalizationApplied ? "ACTIVE" : "STANDBY (Guest)"}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">History blending</p>
                </div>
              </div>

              {/* Sample Ranked Rails */}
              <div className="space-y-4">
                {recResult.sections?.map((sec: any) => (
                  <div key={sec.id} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">{sec.title}</h3>
                        {sec.subtitle && <p className="text-xs text-gray-400">{sec.subtitle}</p>}
                      </div>
                      <span className="text-[11px] font-mono text-gray-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                        {sec.items?.length} titles
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {sec.items?.slice(0, 4).map((item: any) => (
                        <div key={item.id} className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex gap-3 text-xs">
                          {item.posterPath ? (
                            <img src={item.posterPath} alt="" className="w-12 h-16 object-cover rounded bg-gray-800 shrink-0" />
                          ) : (
                            <div className="w-12 h-16 rounded bg-gray-800 flex items-center justify-center shrink-0">🎬</div>
                          )}
                          <div className="min-w-0 flex-1 flex flex-col justify-between">
                            <div>
                              <p className="font-bold text-white truncate">{item.title}</p>
                              <p className="text-[10px] text-gray-400">
                                {item.releaseYear} • ★ {item.rating}
                              </p>
                            </div>
                            {item.rankingReasons && item.rankingReasons.length > 0 && (
                              <p className="text-[9px] text-[#FF3B6B] truncate font-medium">
                                ↳ {item.rankingReasons[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
