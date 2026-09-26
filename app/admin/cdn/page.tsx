"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CdnOperationalSnapshot, CdnHealthMetrics, CdnNodeConfig } from "@/lib/cdn/cdn-types";

export default function AdminCdnPage() {
  const [snapshot, setSnapshot] = useState<CdnOperationalSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  const fetchCdnData = useCallback(async () => {
    try {
      const res = await fetch("/api/cdn/health");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSnapshot(json.data);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCdnData();
    const timer = setInterval(fetchCdnData, 8000);
    return () => clearInterval(timer);
  }, [fetchCdnData]);

  const handleAction = async (action: string, cdnId?: string, reason?: string) => {
    setIsActing(true);
    setActionFeedback(null);
    try {
      const res = await fetch("/api/cdn/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, cdnId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback(data.message || "Action executed successfully");
        fetchCdnData();
      } else {
        setActionFeedback(`Error: ${data.error || "Action failed"}`);
      }
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setIsActing(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-10 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30 text-[10px] font-black uppercase tracking-wider">
              EDGE ACCELERATION
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            High-Speed CDN Delivery Control
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Real-time edge cache routing, multi-CDN circuit breakers, origin shield, and failover monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleAction("probe")}
            disabled={isActing}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>📡</span>
            <span>Run Health Probe</span>
          </button>
          <button
            onClick={() => handleAction("reset")}
            disabled={isActing}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            Reset Metrics
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-4 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-2">
          <span>ℹ️</span>
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Global Metrics Cards */}
      {snapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Active Edge Nodes
            </p>
            <p className="text-2xl font-black text-white">
              {snapshot.activeCdnCount} / {snapshot.cdns.length}
            </p>
            <span className="text-[10px] text-emerald-400 mt-1 block">
              Router: {snapshot.routerEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Cache Hit Ratio
            </p>
            <p className="text-2xl font-black text-emerald-400">
              {(snapshot.globalMetrics.cacheHitRatio * 100).toFixed(1)}%
            </p>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              {snapshot.globalMetrics.totalDeliveryRequests} Total Requests
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Average Delivery TTFB
            </p>
            <p className="text-2xl font-black text-white">
              {snapshot.globalMetrics.avgLatencyMs} ms
            </p>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Sub-50ms Edge Target
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Origin Shield Passes
            </p>
            <p className="text-2xl font-black text-[#8A5CFF]">
              {snapshot.globalMetrics.shieldPassCount}
            </p>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              {snapshot.globalMetrics.failoverCount} Failovers Logged
            </span>
          </div>
        </div>
      )}

      {/* CDN Nodes Table & Direct Controls */}
      <div className="rounded-2xl border border-white/10 bg-[#0F172A] overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🌐</span>
            <span>Registered CDN Delivery Nodes</span>
          </h2>
          <span className="text-xs text-zinc-400">
            Intelligent Selection: Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.04] text-zinc-400 font-bold uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Node Name</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Error Rate</th>
                <th className="py-3 px-4">Failures</th>
                <th className="py-3 px-4">Shield</th>
                <th className="py-3 px-4 text-right">Actions / Tests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {snapshot?.cdns.map(({ config, health }) => {
                const isHealthy = health.status === "HEALTHY";
                const isDegraded = health.status === "DEGRADED";
                const isCooldown = health.status === "COOLDOWN";

                return (
                  <tr key={config.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-white">{config.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[200px]">
                          {config.baseUrl || "Local Edge (Proxy Sliced)"}
                        </p>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-bold text-[10px]">
                        {config.region}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isHealthy
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : isDegraded
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {health.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {health.latencyMs}ms
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {(health.errorRate * 100).toFixed(1)}%
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {health.consecutiveFailures}
                    </td>

                    <td className="py-3 px-4">
                      {config.supportsOriginShield ? (
                        <span className="text-emerald-400 text-xs font-bold">✓ Active</span>
                      ) : (
                        <span className="text-zinc-500 text-xs">Direct</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isHealthy ? (
                          <button
                            onClick={() => handleAction("simulate-failure", config.id, "Admin Outage Simulation")}
                            disabled={isActing}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-bold transition cursor-pointer"
                            title="Simulate failure to verify automatic failover"
                          >
                            Simulate Outage
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction("recover", config.id)}
                            disabled={isActing}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold transition cursor-pointer"
                            title="Recover node and restore to healthy pool"
                          >
                            Recover Node
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controlled Failover Test Panel */}
      <div className="rounded-2xl border border-indigo-500/30 bg-[#0F172A] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>🧪</span>
              <span>Controlled CDN Failover Verification Test (Part 43)</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Test CHILLER's real-time failover engine. Triggering an outage simulates consecutive network drops on Primary CDN;
              the router immediately reroutes traffic to Secondary CDN, preserving playback time without reloading the application.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction("simulate-failure", "cdn-primary", "Live Controlled Failover Verification")}
              disabled={isActing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-black shadow-lg shadow-red-600/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              1. Trigger Primary Outage
            </button>
            <button
              onClick={() => handleAction("recover", "cdn-primary")}
              disabled={isActing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-600/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              2. Recover Primary Node
            </button>
          </div>
        </div>
      </div>

      {/* Failover Events Log */}
      <div className="rounded-2xl border border-white/10 bg-[#0F172A] overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>📋</span>
            <span>Recent CDN Failover Events</span>
          </h2>
          <span className="text-xs text-zinc-400">
            {snapshot?.recentFailovers.length || 0} Events Recorded
          </span>
        </div>

        {snapshot?.recentFailovers && snapshot.recentFailovers.length > 0 ? (
          <div className="divide-y divide-white/5">
            {snapshot.recentFailovers.map((ev) => (
              <div key={ev.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">
                      {ev.failedCdnId}
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      {ev.newCdnId}
                    </span>
                    <span className="text-zinc-500 text-[10px]">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-zinc-300 mt-1">Reason: {ev.reason}</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                    Position: {Math.floor(ev.playbackPositionSeconds / 60)}m {Math.floor(ev.playbackPositionSeconds % 60)}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-500 text-xs">
            No failover events recorded yet. All CDN nodes are operating within optimal parameters.
          </div>
        )}
      </div>
    </div>
  );
}
