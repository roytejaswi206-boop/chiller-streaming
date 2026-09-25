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
  pools?: string[];
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
    averageStartupMs?: number;
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
  const [selectedPool, setSelectedPool] = useState<"ALL" | "GENERAL" | "ANIME">("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: string; latencyMs: number; message?: string }>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

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
    } catch {
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

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/admin/providers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleEnabled", providerId: id, enabled: !currentEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setProviders((prev) =>
          prev.map((p) => (p.id === id ? { ...p, enabled: !currentEnabled } : p))
        );
        showFeedback(data.message);
      }
    } catch {
      // Ignore
    }
  };

  const handleUpdatePriority = async (id: string, delta: number) => {
    const current = providers.find((p) => p.id === id);
    if (!current) return;
    const newPriority = Math.max(1, current.priority + delta);
    try {
      const res = await fetch("/api/admin/providers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setPriority", providerId: id, priority: newPriority }),
      });
      const data = await res.json();
      if (data.success) {
        setProviders((prev) =>
          prev.map((p) => (p.id === id ? { ...p, priority: newPriority } : p))
        );
        showFeedback(data.message);
      }
    } catch {
      // Ignore
    }
  };

  const handleResetHealth = async (id?: string) => {
    try {
      const res = await fetch("/api/admin/providers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetHealth", providerId: id }),
      });
      const data = await res.json();
      if (data.success) {
        loadProviders();
        showFeedback(data.message);
      }
    } catch {
      // Ignore
    }
  };

  const filteredProviders = providers.filter((p) => {
    const isAnimeProvider = p.pools?.includes("ANIME") || p.capabilities?.supportsAnime;
    const isGeneralProvider = p.pools?.includes("GENERAL") || p.capabilities?.supportsMovie || p.capabilities?.supportsTV;

    if (selectedPool === "GENERAL" && !isGeneralProvider) return false;
    if (selectedPool === "ANIME" && !isAnimeProvider) return false;

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
            <span className="text-xs text-zinc-400 font-mono">{providers.length} Managed Providers</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Playback Infrastructure & Health
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor, prioritize, test, and failover across external video hosts, resolvers, and streaming backends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleResetHealth()}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300 transition cursor-pointer"
            title="Reset health metrics for all providers"
          >
            ↺ Reset All Health
          </button>
          <Link
            href="/admin/playback-lab"
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition"
          >
            🧪 General Lab
          </Link>
          <Link
            href="/admin/playback-lab/anime"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8A5CFF] to-[#A78BFA] hover:brightness-110 text-xs font-bold text-white shadow-lg shadow-[#8A5CFF]/25 transition"
          >
            ⛩️ Anime Lab
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

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-in fade-in duration-200 flex items-center justify-between">
          <span>✓ {actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── Section 33: Provider Performance Dashboard Table ── */}
      <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B6B] animate-pulse" />
              Runtime Routing Performance Dashboard
            </h2>
            <p className="text-[11px] text-zinc-400">
              Live scoring and telemetry used by CHILLER&apos;s smart source selection and circuit breaker engine.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-zinc-400">Pool Filter:</span>
            <button
              onClick={() => setSelectedPool("ALL")}
              className={`px-2 py-1 rounded-lg text-xs font-bold ${selectedPool === "ALL" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedPool("GENERAL")}
              className={`px-2 py-1 rounded-lg text-xs font-bold ${selectedPool === "GENERAL" ? "bg-[#FF3B6B] text-white" : "text-zinc-400 hover:text-white"}`}
            >
              General ({providers.filter((p) => p.pools?.includes("GENERAL") || p.capabilities?.supportsMovie).length})
            </button>
            <button
              onClick={() => setSelectedPool("ANIME")}
              className={`px-2 py-1 rounded-lg text-xs font-bold ${selectedPool === "ANIME" ? "bg-[#8A5CFF] text-white" : "text-zinc-400 hover:text-white"}`}
            >
              Anime ({providers.filter((p) => p.pools?.includes("ANIME") || p.capabilities?.supportsAnime).length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[11px] uppercase font-mono tracking-wider">
                <th className="py-2.5 px-3">Provider</th>
                <th className="py-2.5 px-3">Pool</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Attempts</th>
                <th className="py-2.5 px-3">Success</th>
                <th className="py-2.5 px-3">Failure Rate</th>
                <th className="py-2.5 px-3">Avg Latency</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Health Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredProviders.map((p) => {
                const totalAttempts = p.health.totalSuccess + p.health.totalFailures;
                const failureRate = totalAttempts > 0 ? ((p.health.totalFailures / totalAttempts) * 100).toFixed(1) + "%" : "0.0%";
                const isAnime = p.pools?.includes("ANIME") || p.capabilities?.supportsAnime;
                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-600" />
                      {p.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${isAnime ? "bg-[#8A5CFF]/20 text-[#A78BFA]" : "bg-[#FF3B6B]/20 text-[#FF5A85]"}`}>
                        {isAnime ? "ANIME" : "GENERAL"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleToggleEnabled(p.id, p.enabled)}
                        className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer uppercase ${p.enabled ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                        title="Click to toggle enabled/disabled"
                      >
                        {p.enabled ? "ENABLED" : "DISABLED"}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">{totalAttempts}</td>
                    <td className="py-2.5 px-3 text-emerald-400">{p.health.totalSuccess}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{failureRate}</td>
                    <td className="py-2.5 px-3 text-zinc-300">{p.health.latencyMs || p.health.averageStartupMs || 0}ms</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdatePriority(p.id, -1)}
                          className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                          title="Increase Priority (lower number)"
                        >
                          -
                        </button>
                        <span className="font-bold text-white min-w-[20px] text-center">{p.priority}</span>
                        <button
                          onClick={() => handleUpdatePriority(p.id, 1)}
                          className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                          title="Decrease Priority (higher number)"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">{getStatusBadge(p)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => handleTestConnection(p.id)}
                          disabled={testingId === p.id}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                        >
                          {testingId === p.id ? "Probing..." : "Test"}
                        </button>
                        <button
                          onClick={() => handleResetHealth(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-bold transition cursor-pointer"
                          title="Reset health metrics"
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "ALL", label: "All Categories" },
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
                  : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] transition"
          />
        </div>
      </div>

      {/* Providers Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 font-mono text-sm">
          Loading provider status & telemetry...
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-2">
          <p className="text-zinc-400 font-bold text-sm">No providers match your criteria</p>
          <p className="text-zinc-500 text-xs">Try selecting a different pool or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map((p) => {
            const test = testResults[p.id];
            const isAnime = p.pools?.includes("ANIME") || p.capabilities?.supportsAnime;

            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-[#0F172A] border border-white/10 hover:border-white/20 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top card bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white text-base tracking-tight">{p.name}</h3>
                        <span className="text-[10px] font-mono text-zinc-500">#{p.id}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        {p.category.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(p)}
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black uppercase ${
                          isAnime
                            ? "bg-[#8A5CFF]/20 text-[#A78BFA] border border-[#8A5CFF]/30"
                            : "bg-[#FF3B6B]/20 text-[#FF5A85] border border-[#FF3B6B]/30"
                        }`}
                      >
                        {isAnime ? "ANIME POOL" : "GENERAL POOL"}
                      </span>
                    </div>
                  </div>

                  {/* Capabilities badges */}
                  <div className="flex flex-wrap gap-1">
                    {p.capabilities.supportsMovie && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-zinc-300 border border-white/5">
                        Movies
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
                    {p.capabilities.supportsSub && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-zinc-300 border border-white/5">
                        SUB
                      </span>
                    )}
                    {p.capabilities.supportsDub && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-zinc-300 border border-white/5">
                        DUB
                      </span>
                    )}
                    {p.capabilities.supportsEvents && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        Events
                      </span>
                    )}
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
                    <div className="flex justify-between text-zinc-400">
                      <span>Priority:</span>
                      <div className="flex items-center gap-1 font-bold text-white">
                        <button
                          onClick={() => handleUpdatePriority(p.id, -1)}
                          className="px-1 bg-white/10 rounded hover:bg-white/20"
                        >
                          -
                        </button>
                        <span>{p.priority}</span>
                        <button
                          onClick={() => handleUpdatePriority(p.id, 1)}
                          className="px-1 bg-white/10 rounded hover:bg-white/20"
                        >
                          +
                        </button>
                      </div>
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
                  <button
                    onClick={() => handleToggleEnabled(p.id, p.enabled)}
                    className={`py-1.5 px-3 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      p.enabled
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    }`}
                  >
                    {p.enabled ? "Disable" : "Enable"}
                  </button>

                  <button
                    onClick={() => handleResetHealth(p.id)}
                    className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[11px] font-bold transition cursor-pointer"
                    title="Reset health metrics"
                  >
                    Reset
                  </button>

                  <button
                    onClick={() => handleTestConnection(p.id)}
                    disabled={testingId === p.id}
                    className="ml-auto py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold transition disabled:opacity-50 cursor-pointer"
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
