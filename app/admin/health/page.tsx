"use client";

import React, { useState, useEffect } from "react";

interface HealthComponent {
  name: string;
  category: "CORE" | "EXTERNAL" | "STORAGE";
  status: "HEALTHY" | "DEGRADED" | "DOWN" | "PENDING";
  latencyMs?: number;
  message: string;
}

export default function AdminHealthPage() {
  const [components, setComponents] = useState<HealthComponent[]>([]);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>("");

  const runHealthCheck = async () => {
    setChecking(true);
    const results: HealthComponent[] = [];

    // 1. Check Database
    try {
      const start = Date.now();
      const res = await fetch("/api/health/database");
      const latency = Date.now() - start;
      results.push({
        name: "SQLite Database",
        category: "CORE",
        status: res.ok ? "HEALTHY" : "DOWN",
        latencyMs: latency,
        message: res.ok ? "Connected and accepting queries." : "Database connection failed.",
      });
    } catch (err: any) {
      results.push({
        name: "SQLite Database",
        category: "CORE",
        status: "DOWN",
        message: err.message,
      });
    }

    // 2. Check Storage
    try {
      const start = Date.now();
      const res = await fetch("/api/health/storage");
      const latency = Date.now() - start;
      results.push({
        name: "Media Storage Subsystem",
        category: "STORAGE",
        status: res.ok ? "HEALTHY" : "DOWN",
        latencyMs: latency,
        message: res.ok ? "Local file system mounted with write permissions." : "Storage check failed.",
      });
    } catch (err: any) {
      results.push({
        name: "Media Storage Subsystem",
        category: "STORAGE",
        status: "DOWN",
        message: err.message,
      });
    }

    // 3. Check TMDB API
    try {
      const start = Date.now();
      const res = await fetch("/api/discover?category=trending&page=1");
      const latency = Date.now() - start;
      results.push({
        name: "TMDB Discovery Gateway",
        category: "EXTERNAL",
        status: res.ok ? "HEALTHY" : "DEGRADED",
        latencyMs: latency,
        message: res.ok ? "API token authenticated, discovery responding." : "TMDB rate-limited or unavailable.",
      });
    } catch (err: any) {
      results.push({
        name: "TMDB Discovery Gateway",
        category: "EXTERNAL",
        status: "DOWN",
        message: err.message,
      });
    }

    // 4. Check AniList GraphQL
    try {
      const start = Date.now();
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ Page(page:1, perPage:1){ media { id } } }" }),
      });
      const latency = Date.now() - start;
      results.push({
        name: "AniList GraphQL Engine",
        category: "EXTERNAL",
        status: res.ok ? "HEALTHY" : "DEGRADED",
        latencyMs: latency,
        message: res.ok ? "Public anime GraphQL API responsive." : "AniList returned HTTP error.",
      });
    } catch (err: any) {
      results.push({
        name: "AniList GraphQL Engine",
        category: "EXTERNAL",
        status: "DOWN",
        message: err.message,
      });
    }

    // 5. Check Playback Providers
    try {
      const start = Date.now();
      const res = await fetch("/api/admin/providers/status");
      const latency = Date.now() - start;
      results.push({
        name: "Playback Multi-Provider Orchestrator",
        category: "CORE",
        status: res.ok ? "HEALTHY" : "DOWN",
        latencyMs: latency,
        message: res.ok ? "Candidate resolver and failover engine ready." : "Resolver status check failed.",
      });
    } catch (err: any) {
      results.push({
        name: "Playback Multi-Provider Orchestrator",
        category: "CORE",
        status: "DOWN",
        message: err.message,
      });
    }

    setComponents(results);
    setLastCheck(new Date().toLocaleTimeString());
    setChecking(false);
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
            System Observability
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Infrastructure Health Status
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time diagnostics across database, storage, discovery providers, and playback resolvers.
          </p>
        </div>

        <button
          onClick={runHealthCheck}
          disabled={checking}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] hover:opacity-90 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-[#FF3B6B]/20 disabled:opacity-50 cursor-pointer"
        >
          {checking ? "Checking Systems..." : "RUN FULL HEALTH CHECK"}
        </button>
      </div>

      {lastCheck && (
        <p className="text-xs text-zinc-500 font-mono">
          Last health audit completed at {lastCheck}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {components.map((comp) => {
          const isHealthy = comp.status === "HEALTHY";
          const isDegraded = comp.status === "DEGRADED";

          return (
            <div
              key={comp.name}
              className="p-5 rounded-2xl border border-white/10 bg-[#12121a] flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        isHealthy
                          ? "bg-emerald-400 shadow-lg shadow-emerald-400/40"
                          : isDegraded
                          ? "bg-amber-400"
                          : "bg-rose-500"
                      }`}
                    />
                    <h3 className="text-sm font-bold text-white">{comp.name}</h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      isHealthy
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isDegraded
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {comp.status}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mt-1">{comp.message}</p>
              </div>

              {comp.latencyMs !== undefined && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-zinc-500">
                  <span>Ping Latency:</span>
                  <span className={isHealthy ? "text-emerald-400 font-bold" : "text-amber-400"}>
                    {comp.latencyMs} ms
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
