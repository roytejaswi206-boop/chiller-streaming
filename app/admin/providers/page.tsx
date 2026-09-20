"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface ProviderData {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  category: "VIDEO_HOST" | "SELF_HOSTED" | "PLATFORM" | "EMBED_RESOLVER";
  integrationType: string;
  authType: string;
  referenceUrl: string;
  docsUrl: string;
  envFlag: string;
  setupStatus: string;
  capabilities: {
    supportsMovie: boolean;
    supportsTV: boolean;
    supportsAnime: boolean;
    supportsSub: boolean;
    supportsDub: boolean;
    supportsEvents: boolean;
    hasCaptions: boolean;
    requiresApiKey: boolean;
  };
  health: {
    status: string;
    latencyMs: number;
    totalSuccess: number;
    totalFailures: number;
    lastSuccess?: string;
    lastFailure?: string;
    lastError?: string;
    score?: number;
  };
  embedPolicy?: {
    safetyTier: "STRICT" | "COMPATIBLE" | "RELAXED";
    sandbox: string;
    popups: "BLOCKED" | "ALLOWED";
    topNavigation: "BLOCKED" | "ALLOWED";
    fullscreen: "SUPPORTED" | "UNSUPPORTED";
    orientation: "SUPPORTED" | "UNSUPPORTED";
  };
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: string; latencyMs: number; message?: string }>>({});

  const loadProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/providers/status");
      if (res.ok) {
        const json = await res.json();
        setProviders(json.providers || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/providers/test?provider=${id}`);
      const json = await res.json().catch(() => ({}));
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          status: json.status || (json.healthy ? "ONLINE" : "FAILED"),
          latencyMs: json.latencyMs || 0,
          message: json.message || "Ping completed",
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          status: "TIMEOUT",
          latencyMs: 0,
          message: "Request timed out",
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const filteredProviders = providers.filter((p) => {
    const matchesCategory =
      filterCategory === "ALL" || p.category === filterCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.integrationType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusBadge = (p: ProviderData) => {
    if (!p.enabled) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
          DISABLED
        </span>
      );
    }
    const test = testResults[p.id];
    const status = test?.status || p.health.status || p.setupStatus;

    switch (status) {
      case "ACTIVE":
      case "ONLINE":
      case "HEALTHY":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            HEALTHY
          </span>
        );
      case "DEGRADED":
      case "RATE_LIMITED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
            DEGRADED
          </span>
        );
      case "NOT_CONFIGURED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            NOT CONFIGURED
          </span>
        );
      case "FAILED":
      case "AUTH_ERROR":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
            AUTH ERROR
          </span>
        );
      case "TIMEOUT":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
            TIMEOUT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
              Provider Source Directory
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-zinc-400 font-mono">21 Managed Services</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Playback Infrastructure & Health
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor, prioritize, and verify external video hosts, self-hosted media servers, and stream resolvers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/providers/sources"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition"
          >
            🗺️ Source Mapping
          </Link>
          <Link
            href="/admin/playback-lab"
            className="px-4 py-2 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-xs font-bold text-white shadow-lg shadow-[#FF3B6B]/20 transition"
          >
            🧪 Playback Lab
          </Link>
          <button
            onClick={loadProviders}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "ALL", label: "All Providers" },
            { id: "VIDEO_HOST", label: "Video Hosts" },
            { id: "SELF_HOSTED", label: "Self-Hosted" },
            { id: "PLATFORM", label: "Platforms / AVOD" },
            { id: "EMBED_RESOLVER", label: "Resolvers" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterCategory === tab.id
                  ? "bg-white text-black shadow-md"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by provider name, type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 px-3.5 py-1.5 rounded-xl bg-[#12121a] border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF3B6B]"
        />
      </div>

      {/* Providers Grid */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 font-medium text-xs">
          Loading provider status and telemetry...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProviders.map((p) => {
            const test = testResults[p.id];

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-[#12121a] p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-white/20 transition group"
              >
                <div className="space-y-3">
                  {/* Top line */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight group-hover:text-[#FF3B6B] transition">
                          {p.name}
                        </h3>
                        <span className="text-[10px] font-mono text-zinc-500">#{p.priority}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-zinc-400">
                          {p.category.replace("_", " ")}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-[10px] font-mono text-zinc-500">{p.integrationType}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(p)}
                    </div>
                  </div>

                  {/* Capabilities Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {p.capabilities.supportsMovie && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-zinc-300 border border-white/5">
                        Movie
                      </span>
                    )}
                    {p.capabilities.supportsTV && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-zinc-300 border border-white/5">
                        TV
                      </span>
                    )}
                    {p.capabilities.supportsAnime && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-zinc-300 border border-white/5">
                        Anime
                      </span>
                    )}
                    {p.capabilities.supportsEvents && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        postMessage
                      </span>
                    )}
                    {p.capabilities.hasCaptions && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        CC
                      </span>
                    )}
                  </div>

                  {/* Safety & Sandboxing 2.0 Dashboard */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-black/60 to-black/30 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                        <span className="text-emerald-400">🛡️</span> Safety Tier
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          (p.embedPolicy?.safetyTier || "STRICT") === "STRICT"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : (p.embedPolicy?.safetyTier || "STRICT") === "COMPATIBLE"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {p.embedPolicy?.safetyTier || "STRICT"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5 text-[10px] font-mono">
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.02]">
                        <span className="text-zinc-400">Sandbox:</span>
                        <span className="text-emerald-400 font-bold">{p.embedPolicy?.sandbox || "ENABLED"}</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.02]">
                        <span className="text-zinc-400">Popups:</span>
                        <span
                          className={
                            (p.embedPolicy?.popups || "BLOCKED") === "BLOCKED"
                              ? "text-emerald-400 font-bold"
                              : "text-amber-400 font-bold"
                          }
                        >
                          {p.embedPolicy?.popups || "BLOCKED"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.02]">
                        <span className="text-zinc-400">Top Nav:</span>
                        <span
                          className={
                            (p.embedPolicy?.topNavigation || "BLOCKED") === "BLOCKED"
                              ? "text-emerald-400 font-bold"
                              : "text-amber-400 font-bold"
                          }
                        >
                          {p.embedPolicy?.topNavigation || "BLOCKED"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.02]">
                        <span className="text-zinc-400">Rotate/FS:</span>
                        <span className="text-blue-400 font-bold">
                          {p.embedPolicy?.orientation === "SUPPORTED" ? "SUPPORTED" : "UNSUPPORTED"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Block */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Auth Model:</span>
                      <span className="text-zinc-200">{p.authType}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Env Flag:</span>
                      <span className="text-zinc-200 truncate max-w-[150px]">{p.envFlag}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Requests:</span>
                      <span className="text-zinc-200">
                        {p.health.totalSuccess + p.health.totalFailures} ({p.health.totalSuccess} succ)
                      </span>
                    </div>

                    {test && (
                      <div className="pt-1.5 mt-1.5 border-t border-white/5 flex flex-col gap-0.5">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Test Result:</span>
                          <span
                            className={
                              test.status === "ACTIVE" || test.status === "ONLINE"
                                ? "text-emerald-400 font-bold"
                                : "text-rose-400 font-bold"
                            }
                          >
                            {test.status} ({test.latencyMs}ms)
                          </span>
                        </div>
                        {test.message && (
                          <div className="text-[10px] text-zinc-500 truncate">{test.message}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  {p.docsUrl && (
                    <a
                      href={p.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-zinc-500 hover:text-white transition underline underline-offset-2"
                    >
                      Docs ↗
                    </a>
                  )}

                  <button
                    onClick={() => handleTestConnection(p.id)}
                    disabled={testingId === p.id}
                    className="ml-auto py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {testingId === p.id ? "Probing..." : "Test Connection"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
