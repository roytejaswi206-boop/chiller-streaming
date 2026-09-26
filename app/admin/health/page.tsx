"use client";

import React, { useState, useEffect } from "react";

interface ComponentHealth {
  name: string;
  category: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  latencyMs: number;
  message: string;
}

export default function AdminHealthPage() {
  const [components, setComponents] = useState<ComponentHealth[]>([]);
  const [overallStatus, setOverallStatus] = useState<string>("CHECKING");
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>("");

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const json = await res.json();
      setOverallStatus(json.status || "HEALTHY");
      setComponents(json.components || []);
      setLastCheck(new Date().toLocaleTimeString());
    } catch {
      setOverallStatus("DOWN");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            System Reliability
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            System Health & Infrastructure Probes
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time ping probes and database query latency tests across core engines and storage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runHealthCheck}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition cursor-pointer"
          >
            {loading ? "Probing..." : "⚡ Run Live Probe"}
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          overallStatus === "HEALTHY"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : overallStatus === "DEGRADED"
            ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
            : "bg-rose-500/10 border-rose-500/20 text-rose-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${
              overallStatus === "HEALTHY"
                ? "bg-emerald-400 animate-pulse"
                : overallStatus === "DEGRADED"
                ? "bg-amber-400 animate-ping"
                : "bg-rose-500"
            }`}
          />
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">
              System Status: {overallStatus}
            </h2>
            <p className="text-xs opacity-80 mt-0.5">
              {overallStatus === "HEALTHY"
                ? "All critical platform subsystems are responding normally to active probes."
                : "One or more subsystems reported degraded metrics or slow latency."}
            </p>
          </div>
        </div>
        {lastCheck && (
          <span className="text-[11px] font-mono opacity-60">Last Probed: {lastCheck}</span>
        )}
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {components.map((comp) => (
          <div
            key={comp.name}
            className="rounded-2xl border border-white/10 bg-[#12121a] p-5 space-y-3 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                  {comp.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    comp.status === "HEALTHY"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : comp.status === "DEGRADED"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {comp.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{comp.name}</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{comp.message}</p>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>Probe Latency</span>
              <span className="text-white font-bold">{comp.latencyMs}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
