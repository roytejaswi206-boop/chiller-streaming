"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { IconCheck, IconSettings } from "@/components/icons";

interface ServiceStatus {
  isConfigured: boolean;
  status: "CONNECTED" | "NOT_CONFIGURED" | "ERROR";
  message: string;
  maskedKey: string;
}

interface AggregatorStatus {
  isConfigured: boolean;
  status: "CONNECTED" | "NOT_CONFIGURED" | "ERROR";
  url: string;
  message: string;
}

interface ContentProviderMeta {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  requiresApiKey: boolean;
  isConfigured: boolean;
  priority: number;
}

interface PlaybackProviderMeta {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  requiresApiKey: boolean;
  supportsMovie: boolean;
  supportsTV: boolean;
  supportsAnime?: boolean;
}

interface TestResult {
  status: "PASS" | "FAIL" | "NOT_CONFIGURED";
  message: string;
  url?: string;
  latencyMs?: number;
}

export default function AdminSettingsPage() {
  const [tmdbInfo, setTmdbInfo] = useState<ServiceStatus>({
    isConfigured: false,
    status: "NOT_CONFIGURED",
    message: "Loading...",
    maskedKey: "",
  });

  const [codeSpecterInfo, setCodeSpecterInfo] = useState<ServiceStatus>({
    isConfigured: false,
    status: "NOT_CONFIGURED",
    message: "Loading...",
    maskedKey: "",
  });

  const [aggregatorInfo, setAggregatorInfo] = useState<AggregatorStatus>({
    isConfigured: false,
    status: "NOT_CONFIGURED",
    url: "",
    message: "Loading...",
  });

  const [metadataProviders, setMetadataProviders] = useState<ContentProviderMeta[]>([]);
  const [playbackProviders, setPlaybackProviders] = useState<PlaybackProviderMeta[]>([]);
  const [providerHealth, setProviderHealth] = useState<Record<string, any>>({});

  const [metadataTestResults, setMetadataTestResults] = useState<Record<string, TestResult>>({});
  const [playbackTestResults, setPlaybackTestResults] = useState<Record<string, TestResult>>({});
  const [runningTests, setRunningTests] = useState<Record<string, boolean>>({});

  const [tmdbInputKey, setTmdbInputKey] = useState("");
  const [codeSpecterInputKey, setCodeSpecterInputKey] = useState("");
  const [aggregatorInputUrl, setAggregatorInputUrl] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load current status & providers
  const loadStatus = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setTmdbInfo(data.tmdb);
        setCodeSpecterInfo(data.codespecter);
        if (data.aggregator) {
          setAggregatorInfo(data.aggregator);
        }
      }

      // Metadata providers
      const metaRes = await fetch("/api/admin/content-providers/status");
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        setMetadataProviders(metaData.providers || []);
      }

      // Playback providers
      const pRes = await fetch("/api/admin/providers/status");
      if (pRes.ok) {
        const pData = await pRes.json();
        setPlaybackProviders(pData.providers || []);
        setProviderHealth(pData.healthStats || {});
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbApiKey: tmdbInputKey || undefined,
          codeSpecterApiKey: codeSpecterInputKey || undefined,
          playbackAggregatorUrl: aggregatorInputUrl !== "" ? aggregatorInputUrl : undefined,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTmdbInputKey("");
        setCodeSpecterInputKey("");
        setAggregatorInputUrl("");
        await loadStatus();
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch {
      // Ignore
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestMetadataProvider = async (providerId: string) => {
    setRunningTests((prev) => ({ ...prev, [`meta-${providerId}`]: true }));
    try {
      const res = await fetch("/api/admin/content-providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      setMetadataTestResults((prev) => ({
        ...prev,
        [providerId]: {
          status: data.status,
          message: data.message,
          latencyMs: data.latencyMs,
        },
      }));
    } catch (err: any) {
      setMetadataTestResults((prev) => ({
        ...prev,
        [providerId]: {
          status: "FAIL",
          message: err.message || "Failed to reach provider",
        },
      }));
    } finally {
      setRunningTests((prev) => ({ ...prev, [`meta-${providerId}`]: false }));
    }
  };

  const handleTestPlaybackProvider = async (providerId: string, testType: "movie" | "tv" | "anime" | "health") => {
    const testKey = `pb-${providerId}-${testType}`;
    setRunningTests((prev) => ({ ...prev, [testKey]: true }));

    try {
      const res = await fetch("/api/admin/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          type: testType,
          tmdbId: testType === "movie" ? 550 : testType === "tv" ? 1399 : 21,
        }),
      });
      const data = await res.json();
      setPlaybackTestResults((prev) => ({
        ...prev,
        [providerId]: {
          status: data.success ? "PASS" : "FAIL",
          message: data.message,
          url: data.url,
          latencyMs: data.latencyMs,
        },
      }));
    } catch (err: any) {
      setPlaybackTestResults((prev) => ({
        ...prev,
        [providerId]: {
          status: "FAIL",
          message: err.message || "Test request failed",
        },
      }));
    } finally {
      setRunningTests((prev) => ({ ...prev, [testKey]: false }));
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto font-sans">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF3B6B] uppercase tracking-wider mb-1">
            <IconSettings className="w-4 h-4" />
            Platform Control
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Chiller Provider Intelligence &amp; Playback Engine
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Separated content intelligence pipeline and independent playback fallback network.
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition"
        >
          View Public Site
        </Link>
      </div>

      {saveSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <IconCheck className="w-4 h-4 text-emerald-400" />
          Settings updated successfully!
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: METADATA & CONTENT PROVIDERS                  */}
      {/* ======================================================== */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8A5CFF]" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Metadata &amp; Content Intelligence Providers
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Multi-source metadata normalization layer: TMDB core, AniList GraphQL, Jikan anime, TVmaze TV, TheTVDB, Watchmode availability, and OpenSubtitles.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {metadataProviders.map((mp) => {
            const isTesting = runningTests[`meta-${mp.id}`];
            const testResult = metadataTestResults[mp.id];

            return (
              <div
                key={mp.id}
                className="rounded-2xl border border-white/10 bg-[#0F172A] p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8A5CFF]/20 text-[#8A5CFF] border border-[#8A5CFF]/30 uppercase tracking-wider">
                      {mp.category}
                    </span>
                    <h3 className="text-sm font-bold text-white">{mp.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-zinc-400 border border-white/10">
                      ID: {mp.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        mp.isConfigured
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-400 border border-white/5"
                      }`}
                    >
                      {mp.requiresApiKey
                        ? mp.isConfigured
                          ? "Configured ✓"
                          : "Not Configured"
                        : "Public / No Key"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        mp.enabled ? "bg-sky-500/20 text-sky-300" : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {mp.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400">
                    Priority: {mp.priority} • {mp.id === "tmdb" ? "Primary catalog & images" : mp.id === "anilist" ? "High-res titles & anime characters" : mp.id === "watchmode" ? "Streaming availability only (not playback)" : "Enrichment provider"}
                  </p>

                  {testResult && (
                    <div className="mt-2 p-2 rounded-lg bg-[#09090C] border border-white/10 text-xs flex items-center gap-2">
                      <span
                        className={`font-black text-[10px] px-1.5 py-0.5 rounded ${
                          testResult.status === "PASS"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : testResult.status === "NOT_CONFIGURED"
                            ? "bg-zinc-700 text-zinc-300"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {testResult.status}
                      </span>
                      <span className="text-zinc-300 truncate text-[11px]">{testResult.message}</span>
                      {testResult.latencyMs !== undefined && (
                        <span className="text-zinc-500 font-mono text-[10px] ml-auto">
                          {testResult.latencyMs}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => handleTestMetadataProvider(mp.id)}
                    disabled={isTesting}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isTesting ? "Testing..." : "Test Connection"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: PLAYBACK PROVIDER REGISTRY                   */}
      {/* ======================================================== */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B6B]" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Playback Provider Registry &amp; Fallback Engine
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Independent playback sources. HTTP 200 reachability is clearly distinguished from browser video playback verification.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {playbackProviders.map((p) => {
            const health = providerHealth[p.id];
            const testResult = playbackTestResults[p.id];
            const isTestingMovie = runningTests[`pb-${p.id}-movie`];
            const isTestingTV = runningTests[`pb-${p.id}-tv`];
            const isTestingHealth = runningTests[`pb-${p.id}-health`];

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-mono text-[10px] font-bold text-[#FF3B6B]">
                      {p.priority}
                    </span>
                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-zinc-300 border border-white/10">
                      ID: {p.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.requiresApiKey
                          ? p.id === "codespecter" && codeSpecterInfo.isConfigured
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-zinc-800 text-zinc-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {p.requiresApiKey ? (codeSpecterInfo.isConfigured ? "Configured ✓" : "Requires API Key") : "Free / No Key"}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mt-0.5">
                    Priority {p.priority} • Supports: {p.supportsMovie ? "Movie" : ""} {p.supportsTV ? "• TV Series" : ""} {p.supportsAnime ? "• Anime (AniList)" : ""}
                  </p>

                  {testResult && (
                    <div className="mt-3 p-2.5 rounded-lg bg-[#09090C] border border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black text-[11px] ${
                            testResult.status === "PASS" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          [{testResult.status}]
                        </span>
                        <span className="text-zinc-300 truncate">{testResult.message}</span>
                        {testResult.latencyMs && (
                          <span className="text-zinc-500 font-mono text-[10px]">
                            ({testResult.latencyMs}ms)
                          </span>
                        )}
                      </div>
                      {testResult.url && (
                        <p className="text-zinc-500 font-mono text-[10px] mt-1 truncate">
                          URL: {testResult.url}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTestPlaybackProvider(p.id, "movie")}
                    disabled={isTestingMovie}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    {isTestingMovie ? "Testing..." : "Test Movie"}
                  </button>
                  {p.supportsTV && (
                    <button
                      onClick={() => handleTestPlaybackProvider(p.id, "tv")}
                      disabled={isTestingTV}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      {isTestingTV ? "Testing..." : "Test TV"}
                    </button>
                  )}
                  {p.supportsAnime && (
                    <button
                      onClick={() => handleTestPlaybackProvider(p.id, "anime")}
                      disabled={runningTests[`pb-${p.id}-anime`]}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
                    >
                      {runningTests[`pb-${p.id}-anime`] ? "Testing..." : "Test Anime (AL 21)"}
                    </button>
                  )}
                  <button
                    onClick={() => handleTestPlaybackProvider(p.id, "health")}
                    disabled={isTestingHealth}
                    className="px-3 py-1.5 rounded-lg bg-[#FF3B6B]/20 hover:bg-[#FF3B6B]/30 text-[#FF3B6B] border border-[#FF3B6B]/30 text-xs font-bold transition cursor-pointer"
                  >
                    {isTestingHealth ? "Checking..." : "Health"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: CREDENTIALS & HOST CONFIGURATION              */}
      {/* ======================================================== */}
      <form onSubmit={handleSave} className="rounded-3xl border border-white/10 bg-[#0F172A] p-6 lg:p-8 shadow-2xl">
        <h2 className="text-base font-bold text-white mb-1">
          Update API Credentials
        </h2>
        <p className="text-xs text-zinc-400 mb-6">
          Configure external credentials securely. Keys remain strictly server-side and are never exposed to clients.
        </p>

        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
              TMDB API Key or Read Access Token (Core Required)
            </label>
            <input
              type="password"
              placeholder={tmdbInfo.maskedKey ? `Configured (${tmdbInfo.maskedKey}) - enter new key to replace` : "Enter TMDB API Key (v3) or Access Token (v4)"}
              value={tmdbInputKey}
              onChange={(e) => setTmdbInputKey(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-[#09090C] border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] transition font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
              CodeSpecter API Key (Optional Playback Provider)
            </label>
            <input
              type="password"
              placeholder={codeSpecterInfo.maskedKey ? `Configured (${codeSpecterInfo.maskedKey}) - enter new key to replace` : "Enter CodeSpecter API Key (optional)"}
              value={codeSpecterInputKey}
              onChange={(e) => setCodeSpecterInputKey(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-[#09090C] border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] transition font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
              Self-Hosted Playback Aggregator URL (Optional)
            </label>
            <input
              type="text"
              placeholder={aggregatorInfo.url ? `Configured (${aggregatorInfo.url})` : "https://your-aggregator.example (optional)"}
              value={aggregatorInputUrl}
              onChange={(e) => setAggregatorInputUrl(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-[#09090C] border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] transition font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            Keys are stored securely in database / environment.
          </span>

          <button
            type="submit"
            disabled={isSaving || (!tmdbInputKey.trim() && !codeSpecterInputKey.trim() && !aggregatorInputUrl.trim())}
            className="px-6 py-2.5 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/20 cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
