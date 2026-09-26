"use client";

import React, { useState, useEffect } from "react";
import { GroupedErrorItem } from "@/lib/analytics/engine";

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<GroupedErrorItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [clearing, setClearing] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/errors");
      if (res.ok) {
        const json = await res.json();
        setErrors(json.errors || []);
        setTotalCount(json.totalErrors || 0);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear all resolved error logs?")) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/admin/analytics/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_errors" }),
      });
      if (res.ok) {
        setErrors([]);
        setTotalCount(0);
        setActionMsg("✓ All error records cleared.");
        setTimeout(() => setActionMsg(null), 3500);
      }
    } catch {
      setActionMsg("Failed to clear errors.");
    } finally {
      setClearing(false);
    }
  };

  const handleSimulate = async () => {
    try {
      const res = await fetch("/api/admin/analytics/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_error",
          service: "RESOLVER",
          level: "ERROR",
          message: "Test provider connection timeout (Diagnostic Probe)",
        }),
      });
      if (res.ok) {
        setActionMsg("✓ Test diagnostic error recorded.");
        setTimeout(() => setActionMsg(null), 3000);
        fetchErrors();
      }
    } catch {
      // Ignore
    }
  };

  const filteredErrors = errors.filter((err) => {
    const matchesService =
      selectedService === "ALL" || err.service.toUpperCase() === selectedService;
    const matchesSearch =
      searchQuery === "" ||
      err.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      err.service.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesService && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20">
            Reliability & Observability
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Centralized Error Center
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Deduplicated runtime exceptions, API rate limits, provider stream timeouts, and sanitized failures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulate}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition border border-white/10 cursor-pointer"
          >
            + Test Probe Error
          </button>
          <button
            onClick={handleClear}
            disabled={clearing || errors.length === 0}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
          >
            {clearing ? "Clearing..." : "🗑️ Clear Resolved"}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
          {actionMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Total Captured Events
          </span>
          <span className="text-2xl font-black text-rose-400 font-mono">{totalCount}</span>
          <p className="text-[11px] text-zinc-500 mt-1">Raw exception occurrences</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Unique Error Signatures
          </span>
          <span className="text-2xl font-black text-white font-mono">{errors.length}</span>
          <p className="text-[11px] text-zinc-500 mt-1">Deduplicated exception groups</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Telemetry Sanitization
          </span>
          <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            STRICT ZERO-PII / ZERO-SECRETS
          </span>
          <p className="text-[11px] text-zinc-500 mt-1">Tokens and keys stripped server-side</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["ALL", "API", "PLAYER", "RESOLVER", "AUTH", "DATABASE", "QUEUE"].map((svc) => (
            <button
              key={svc}
              onClick={() => setSelectedService(svc)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedService === svc
                  ? "bg-[#FF3B6B] text-white"
                  : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {svc}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter errors by keyword or service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-72 h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B]"
        />
      </div>

      {/* Errors Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>Error Signature & Message</span>
          <span>Occurrences & Timestamps</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs">Loading error telemetry...</div>
        ) : filteredErrors.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            <span className="text-emerald-400 font-bold block mb-1">✓ No Matching Exceptions Found</span>
            Platform logs report zero unhandled runtime errors in this category.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredErrors.map((err) => (
              <div
                key={err.signature}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {err.level}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 text-zinc-300">
                      {err.service}
                    </span>
                  </div>
                  <p className="text-zinc-200 font-mono text-xs break-all">{err.message}</p>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {err.occurrences} {err.occurrences === 1 ? "occurrence" : "occurrences"}
                  </span>
                  <div className="text-[10px] text-zinc-500 font-mono text-right">
                    <div>Last: {new Date(err.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    <div>First: {new Date(err.firstSeen).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
