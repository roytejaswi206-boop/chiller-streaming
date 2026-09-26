"use client";

import React, { useState, useEffect } from "react";

interface AuditRecord {
  id: string;
  adminEmail: string;
  action: string;
  target?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [adminSearch, setAdminSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAction !== "ALL") params.set("action", selectedAction);
      if (adminSearch.trim()) params.set("admin", adminSearch.trim());

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
        setTotal(json.total || 0);
        if (json.actions && json.actions.length > 0) {
          setActionTypes(json.actions);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [selectedAction]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#8A5CFF] bg-[#8A5CFF]/10 border border-[#8A5CFF]/20">
            Security & Governance
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Administrative Audit Logs
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cryptographically sealed and immutable audit trail of privileged actions, provider changes, role grants, and settings.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition cursor-pointer"
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setSelectedAction("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedAction === "ALL" ? "bg-[#8A5CFF] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            All Actions ({total})
          </button>
          {actionTypes.map((act) => (
            <button
              key={act}
              onClick={() => setSelectedAction(act)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedAction === act ? "bg-[#8A5CFF] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {act}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="w-full sm:w-72 flex gap-2">
          <input
            type="text"
            placeholder="Filter by admin email..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            className="flex-1 h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8A5CFF]"
          />
          <button
            type="submit"
            className="px-3 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer"
          >
            Find
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>Action & Target</span>
          <span>Administrator, IP & Timestamp</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            No privileged administrative actions recorded matching your query.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#8A5CFF]/20 text-[#8A5CFF] border border-[#8A5CFF]/30">
                      {log.action}
                    </span>
                    <span className="text-white font-bold">{log.target || "System"}</span>
                  </div>
                  {log.details && (
                    <p className="text-zinc-400 font-mono text-[11px] break-all bg-black/30 p-2 rounded-lg border border-white/5">
                      {log.details}
                    </p>
                  )}
                </div>

                <div className="text-left md:text-right text-[11px] text-zinc-400 font-mono shrink-0 space-y-0.5">
                  <div className="text-white font-semibold">{log.adminEmail}</div>
                  <div className="text-zinc-500">{new Date(log.createdAt).toLocaleString()}</div>
                  {log.ipAddress && (
                    <div className="text-[10px] text-zinc-600">IP: {log.ipAddress}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
