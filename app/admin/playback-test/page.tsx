"use client";

import React, { useState } from "react";
import Link from "next/link";
import { IconCheck } from "@/components/icons";

interface TestOutput {
  providerId: string;
  providerName: string;
  priority: number;
  enabled: boolean;
  connection: "PASS" | "FAIL";
  resolution: "PASS" | "FAIL";
  candidateUrl?: string;
  latencyMs: number;
  totalMs: number;
  error?: string;
  status: "READY" | "PARTIAL" | "FAIL";
}

export default function PlaybackTestPage() {
  const [mediaType, setMediaType] = useState<"movie" | "tv" | "anime">("movie");
  const [testId, setTestId] = useState("550");
  const [season, setSeason] = useState("1");
  const [episode, setEpisode] = useState("1");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestOutput[]>([]);
  const [testTarget, setTestTarget] = useState<any>(null);

  const runDiagnosticTest = async (type = mediaType, id = testId, s = season, e = episode) => {
    setIsRunning(true);
    setResults([]);
    try {
      const res = await fetch(
        `/api/playback/test?type=${type}&id=${id}&s=${s}&e=${e}`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTestTarget(data.testTarget);
      }
    } catch (err) {
      console.error("Test failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090C] text-white p-6 sm:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin/settings" className="text-xs text-zinc-400 hover:text-white transition">
                ← Admin Settings
              </Link>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-[#FF3B6B] font-bold">Diagnostics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Concurrent Playback Provider Test
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Execute parallel real-time resolution and reachability checks across all configured providers.
            </p>
          </div>

          <button
            onClick={() => runDiagnosticTest()}
            disabled={isRunning}
            className="px-6 py-3 rounded-2xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-[#FF3B6B]/25 transition cursor-pointer"
          >
            {isRunning ? "Testing in Parallel…" : "Run Concurrent Test"}
          </button>
        </div>

        {/* Target Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#0F172A] border border-white/10">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">
              Media Type
            </label>
            <select
              value={mediaType}
              onChange={(e) => {
                const t = e.target.value as any;
                setMediaType(t);
                if (t === "movie") setTestId("550");
                if (t === "tv") setTestId("1399");
                if (t === "anime") setTestId("16498");
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#09090C] border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-[#FF3B6B]"
            >
              <option value="movie">Movie (Fight Club — TMDB 550)</option>
              <option value="tv">TV Series (Game of Thrones — TMDB 1399)</option>
              <option value="anime">Anime (Solo Leveling / JJK — 16498)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">
              Target ID (TMDB/AniList)
            </label>
            <input
              type="text"
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#09090C] border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-[#FF3B6B]"
            />
          </div>

          {mediaType !== "movie" && (
            <>
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Season
                </label>
                <input
                  type="number"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090C] border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-[#FF3B6B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Episode
                </label>
                <input
                  type="number"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090C] border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-[#FF3B6B]"
                />
              </div>
            </>
          )}
        </div>

        {/* Results Matrix */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-300">
              Provider Test Matrix Output
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0F172A]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-extrabold uppercase text-zinc-400 bg-white/[0.02]">
                    <th className="p-4">Provider</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Connection</th>
                    <th className="p-4">Resolution</th>
                    <th className="p-4">Candidate URL</th>
                    <th className="p-4">Startup Latency</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {results.map((r) => (
                    <tr key={r.providerId} className="hover:bg-white/[0.02] transition">
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <span>{r.providerName}</span>
                      </td>
                      <td className="p-4 text-zinc-400">P{r.priority}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            r.connection === "PASS"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {r.connection}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            r.resolution === "PASS"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {r.resolution}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs truncate text-blue-400 font-mono text-[10px]">
                        {r.candidateUrl || "—"}
                      </td>
                      <td className="p-4 font-mono font-bold text-zinc-200">
                        {r.latencyMs > 0 ? `${r.latencyMs}ms` : "—"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider ${
                            r.status === "READY"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : r.status === "PARTIAL"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          }`}
                        >
                          {r.status === "READY" ? "PASS" : r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
