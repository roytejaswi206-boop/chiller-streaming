import React from "react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminErrorsPage() {
  const errorLogs = await prisma.systemLog.findMany({
    where: { level: { in: ["ERROR", "FATAL"] } },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="border-b border-white/10 pb-6">
        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20">
          Reliability & Diagnostics
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight mt-1">
          Centralized Error Center
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Review critical application failures, provider timeouts, and sanitized runtime exceptions.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>Captured Errors ({errorLogs.length} Records)</span>
          <span>Severity & Service</span>
        </div>

        {errorLogs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            <span className="text-emerald-400 font-bold block mb-1">✓ No Critical Errors Recorded</span>
            System logs report zero unhandled runtime exceptions.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {errorLogs.map((log) => (
              <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {log.level}
                    </span>
                    <span className="text-white font-mono font-semibold">{log.service}</span>
                    <span className="text-zinc-500 text-[10px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-zinc-300 font-mono text-[11px] max-w-3xl truncate">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
