"use client";

import React, { useState } from "react";
import Link from "next/link";

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

export default function GeneralPlaybackLabPage() {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [testId, setTestId] = useState("550");
  const [season, setSeason] = useState("1");
  const [episode, setEpisode] = useState("1");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestOutput[]>([]);
  const [testTarget, setTestTarget] = useState<any>(null);
  const [selectedEmbed, setSelectedEmbed] = useState<string | null>(null);

  const presets = [
    { label: "Fight Club (Movie)", type: "movie" as const, id: "550", s: "1", e: "1" },
    { label: "Inception (Movie)", type: "movie" as const, id: "27205", s: "1", e: "1" },
    { label: "Breaking Bad S1:E1 (TV)", type: "tv" as const, id: "1396", s: "1", e: "1" },
    { label: "Game of Thrones S1:E1 (TV)", type: "tv" as const, id: "1399", s: "1", e: "1" },
  ];

  const runDiagnosticTest = async (type = mediaType, id = testId, s = season, e = episode) => {
    setIsRunning(true);
    setResults([]);
    setSelectedEmbed(null);
    try {
      const res = await fetch(
        `/api/playback/test?type=${type}&id=${id}&s=${s}&e=${e}`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTestTarget(data.testTarget);
        if (data.results?.[0]?.candidateUrl) {
          setSelectedEmbed(data.results[0].candidateUrl);
        }
      }
    } catch (err) {
      console.error("Test failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
              CHILLER SUPER ADMIN
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 border border-sky-500/20">
              GENERAL PLAYBACK POOL
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Movie & TV Playback Lab
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Inspect General Playback Pool resolvers, test source stream health, evaluate fallback chains, and preview live streams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/playback-lab/anime"
            className="text-xs font-bold text-zinc-300 hover:text-white px-3 py-2 rounded-xl border border-white/10 bg-white/5 transition"
          >
            Switch to Anime Lab →
          </Link>
        </div>
      </div>

      {/* Target Configuration Card */}
      <div className="p-6 rounded-2xl border border-white/10 bg-[#12121a] shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
          Test Target Parameters
        </h3>

        <div className="flex flex-wrap gap-2 mb-6">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setMediaType(preset.type);
                setTestId(preset.id);
                setSeason(preset.s);
                setEpisode(preset.e);
                runDiagnosticTest(preset.type, preset.id, preset.s, preset.e);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 hover:bg-white/10 text-zinc-300 hover:text-white transition"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-bold text-zinc-400 block mb-1">Media Type</label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as any)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="movie">Movie</option>
              <option value="tv">TV Series</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-400 block mb-1">TMDB ID</label>
            <input
              type="text"
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              placeholder="e.g. 550"
            />
          </div>

          {mediaType === "tv" && (
            <>
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Season</label>
                <input
                  type="number"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  min="1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Episode</label>
                <input
                  type="number"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  min="1"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => runDiagnosticTest()}
            disabled={isRunning}
            className="px-6 py-2.5 rounded-xl velora-gradient text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2"
          >
            {isRunning ? "Testing Pool Providers..." : "Execute General Pool Diagnostic"}
          </button>
        </div>
      </div>

      {/* Target Title & Results */}
      {testTarget && (
        <div className="p-4 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between text-xs">
          <div>
            <span className="text-zinc-500 font-mono">TARGET: </span>
            <span className="font-bold text-white">{testTarget.title}</span>
            <span className="text-zinc-500 ml-2">({testTarget.year})</span>
          </div>
          <span className="text-emerald-400 font-mono font-bold">
            Pool: GENERAL_POOL (Isolated)
          </span>
        </div>
      )}

      {/* Diagnostic Provider Table */}
      {results.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between text-xs font-bold text-zinc-400">
            <span>Provider Routing Chain ({results.length} Providers Evaluated)</span>
            <span>Latency & Health</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Resolution</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {results.map((r, i) => (
                  <tr key={r.providerId} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-400">#{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{r.providerName}</div>
                      <div className="text-[10px] font-mono text-zinc-500">{r.providerId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === "READY"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : r.status === "PARTIAL"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.resolution === "PASS" ? (
                        <span className="text-emerald-400 font-bold">✓ Resolved</span>
                      ) : (
                        <span className="text-rose-400 font-bold">✗ Failed</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-400">{r.latencyMs}ms</td>
                    <td className="py-3 px-4">
                      {r.candidateUrl && (
                        <button
                          onClick={() => setSelectedEmbed(r.candidateUrl!)}
                          className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white transition"
                        >
                          Preview Stream
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stream Preview Modal / Box */}
      {selectedEmbed && (
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Live Stream Preview</h3>
            <button
              onClick={() => setSelectedEmbed(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              ✕ Close Preview
            </button>
          </div>
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
            <iframe
              src={selectedEmbed}
              className="w-full h-full border-0"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            />
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-2 truncate">
            Source URL: {selectedEmbed}
          </p>
        </div>
      )}
    </div>
  );
}
