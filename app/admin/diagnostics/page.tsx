"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AdminDiagnosticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testQuery, setTestQuery] = useState("action");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/diagnostics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
    const interval = setInterval(loadDiagnostics, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    await fetch("/api/admin/diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_cache" }),
    });
    loadDiagnostics();
  };

  const runTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    try {
      const start = Date.now();
      const res = await fetch(`/api/discover?genre=${encodeURIComponent(testQuery)}&page=1`);
      const json = await res.json();
      setTestResult({
        ...json,
        totalRoundtripMs: Date.now() - start,
      });
      loadDiagnostics();
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const metrics = data?.metrics || {
    totalRequests: 0,
    hits: 0,
    misses: 0,
    inFlightDeduplications: 0,
    providerErrors: 0,
    providerFallbacks: 0,
    totalEntries: 0,
    recentQueries: [],
  };

  const hitRate =
    metrics.totalRequests > 0
      ? Math.round(((metrics.hits + metrics.inFlightDeduplications) / metrics.totalRequests) * 100)
      : 0;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#FF3B6B] uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Diagnostics & Telemetry
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Content Discovery Engine 2.0 Monitor
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Live cache efficiency, in-flight request deduplication, and multi-provider telemetry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearCache}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition cursor-pointer"
            >
              Clear Cache
            </button>
            <button
              onClick={loadDiagnostics}
              className="px-4 py-2 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25 cursor-pointer"
            >
              Refresh Metrics
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-[#0F172A] border border-white/10">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Queries</p>
            <p className="text-2xl font-black text-white">{metrics.totalRequests}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A] border border-white/10">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cache Hits</p>
            <p className="text-2xl font-black text-emerald-400">{metrics.hits}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A] border border-white/10">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">In-Flight Dedup</p>
            <p className="text-2xl font-black text-sky-400">{metrics.inFlightDeduplications}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A] border border-white/10">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cache Misses</p>
            <p className="text-2xl font-black text-amber-400">{metrics.misses}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A] border border-white/10">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Hit Rate</p>
            <p className="text-2xl font-black text-[#FF3B6B]">{hitRate}%</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A] border border-white/10">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cached Entries</p>
            <p className="text-2xl font-black text-zinc-200">{metrics.totalEntries}</p>
          </div>
        </div>

        {/* Live Query Tester */}
        <section className="mb-8 p-6 rounded-3xl bg-[#0F172A] border border-white/10 shadow-xl">
          <h2 className="text-sm font-black uppercase tracking-wider text-white mb-4">
            Live Discovery Query Tester
          </h2>
          <form onSubmit={runTestQuery} className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="e.g. action, kdrama, trending, scifi"
              className="flex-1 min-w-[200px] h-10 px-4 rounded-xl bg-[#181824] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B]"
            />
            <button
              type="submit"
              disabled={testing}
              className="px-6 py-2 rounded-xl bg-[#FF3B6B] text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25 disabled:opacity-50 cursor-pointer"
            >
              {testing ? "Testing..." : "Execute Test Query"}
            </button>
          </form>

          {testResult && (
            <div className="p-4 rounded-2xl bg-[#181824] border border-white/5 text-xs font-mono text-zinc-300 overflow-x-auto">
              <div className="flex flex-wrap gap-4 mb-2 text-zinc-400">
                <span>
                  Provider: <strong className="text-white">{testResult.provider}</strong>
                </span>
                <span>
                  Cache: <strong className="text-[#FF3B6B]">{testResult.cacheSource}</strong>
                </span>
                <span>
                  Items Returned: <strong className="text-emerald-400">{testResult.items?.length || 0}</strong>
                </span>
                <span>
                  Total in Provider: <strong className="text-white">{testResult.totalResults || 0}</strong>
                </span>
                <span>
                  Latency: <strong className="text-white">{testResult.latencyMs || testResult.totalRoundtripMs}ms</strong>
                </span>
              </div>
            </div>
          )}
        </section>

        {/* PWA & Version Lifecycle Monitor */}
        <section className="mb-8 p-6 rounded-3xl bg-[#0F172A] border border-white/10 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                PWA & Version Lifecycle Monitor
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time service worker controller state, active caches, and build version synchronization.
              </p>
            </div>
            <button
              onClick={async () => {
                if ("serviceWorker" in navigator) {
                  const reg = await navigator.serviceWorker.getRegistration();
                  if (reg) {
                    await reg.update();
                    alert("Service worker update check triggered!");
                  }
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              Check SW Update
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#09090C]/60 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Current Client Build</span>
              <p className="text-sm font-mono font-bold text-white mt-1">2026.09.25-5f0f0b8</p>
              <span className="text-[10px] text-zinc-500">v2.1.0 (Production)</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#09090C]/60 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">SW Controller State</span>
              <p className="text-sm font-mono font-bold text-emerald-400 mt-1">
                {typeof window !== "undefined" && navigator.serviceWorker?.controller ? "ACTIVE (CONTROLLING)" : "STANDBY"}
              </p>
              <span className="text-[10px] text-zinc-500">Scope: /</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#09090C]/60 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">PWA Display Mode</span>
              <p className="text-sm font-mono font-bold text-sky-400 mt-1">
                {typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches ? "STANDALONE (INSTALLED)" : "BROWSER TAB"}
              </p>
              <span className="text-[10px] text-zinc-500">Viewport: Native Shell</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#09090C]/60 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Cache Namespace</span>
              <p className="text-sm font-mono font-bold text-[#FF3B6B] mt-1">chiller-v3</p>
              <span className="text-[10px] text-zinc-500">Obsolete Caches Auto-Purged</span>
            </div>
          </div>
        </section>

        {/* Recent Queries Table */}
        <section className="p-6 rounded-3xl bg-[#0F172A] border border-white/10 shadow-xl overflow-hidden">
          <h2 className="text-sm font-black uppercase tracking-wider text-white mb-4">
            Recent Engine Queries
          </h2>

          {metrics.recentQueries?.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No queries logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Query Key</th>
                    <th className="py-2.5 px-3">Provider</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Items</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {metrics.recentQueries.map((q: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 max-w-[320px] truncate text-white">{q.queryKey}</td>
                      <td className="py-2.5 px-3 text-zinc-300">{q.provider}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            q.status === "HIT"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : q.status === "IN_FLIGHT_DEDUP"
                              ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300">{q.itemCount}</td>
                      <td className="py-2.5 px-3 text-zinc-300">{q.latencyMs}ms</td>
                      <td className="py-2.5 px-3 text-zinc-500">
                        {new Date(q.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
