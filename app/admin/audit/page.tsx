import React from "react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const logs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="border-b border-white/10 pb-6">
        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#8A5CFF] bg-[#8A5CFF]/10 border border-[#8A5CFF]/20">
          Security & Compliance
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight mt-1">
          Administrative Audit Logs
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Immutable event log of administrative actions, provider modifications, and role updates.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>Logged Actions ({logs.length} Total)</span>
          <span>Administrator & Timestamp</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            No privileged administrative modifications recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#8A5CFF]/20 text-[#8A5CFF]">
                      {log.action}
                    </span>
                    <span className="text-white font-bold">{log.target || "System"}</span>
                  </div>
                  {log.details && (
                    <p className="text-zinc-400 font-mono text-[11px]">{log.details}</p>
                  )}
                </div>
                <div className="text-right sm:text-left text-[11px] text-zinc-500 font-mono">
                  <span>{log.adminEmail}</span> • <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
