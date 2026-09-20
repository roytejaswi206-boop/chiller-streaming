"use client";

import React, { useState, useEffect } from "react";
import { IconCheck } from "@/components/icons";

interface ProviderStatus {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  capabilities: string[];
  latencyMs?: number;
  healthy?: boolean;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { status: string; latencyMs: number }>>({});

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

  const handleTestProvider = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/providers/test?provider=${id}`);
      if (res.ok) {
        const json = await res.json();
        setTestResult((prev) => ({
          ...prev,
          [id]: { status: json.healthy ? "ONLINE" : "ERROR", latencyMs: json.latencyMs || 0 },
        }));
      }
    } catch {
      setTestResult((prev) => ({
        ...prev,
        [id]: { status: "TIMEOUT", latencyMs: 0 },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
            Playback Infrastructure
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Provider Management & Health
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor, prioritize, and verify external and internal streaming origins.
          </p>
        </div>

        <button
          onClick={loadProviders}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition cursor-pointer"
        >
          ↻ Refresh Providers
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-500 font-medium text-xs">
          Loading provider status...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => {
            const test = testResult[p.id];

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-[#12121a] p-5 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white tracking-tight">{p.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        p.enabled
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {p.enabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 text-zinc-400 border border-white/5"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-black/40 border border-white/5 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Priority Rank:</span>
                      <span className="text-white font-bold">#{p.priority}</span>
                    </div>
                    {test && (
                      <div className="flex justify-between text-zinc-400">
                        <span>Ping Latency:</span>
                        <span className={test.status === "ONLINE" ? "text-emerald-400" : "text-rose-400"}>
                          {test.latencyMs}ms ({test.status})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleTestProvider(p.id)}
                    disabled={testingId === p.id}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer text-center"
                  >
                    {testingId === p.id ? "Pinging..." : "Test Latency"}
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
