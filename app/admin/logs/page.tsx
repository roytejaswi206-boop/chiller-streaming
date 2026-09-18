import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatTimeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface AdminLogsPageProps {
  searchParams: Promise<{ level?: string; service?: string }>;
}

export default async function AdminLogsPage({ searchParams }: AdminLogsPageProps) {
  const { level, service } = await searchParams;

  const where: any = {};
  if (level) where.level = level;
  if (service) where.service = service;

  const logs = await prisma.systemLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            System Event & Error Logs
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Structured observability trail for API errors, queue events, origin failovers, and streaming telemetry
          </p>
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin/logs"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              !level ? "bg-[#FF3864] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            All Logs
          </Link>
          <Link
            href="/admin/logs?level=ERROR"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              level === "ERROR" ? "bg-rose-500 text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Errors
          </Link>
          <Link
            href="/admin/logs?level=WARN"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              level === "WARN" ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Warnings
          </Link>
          <Link
            href="/admin/logs?level=INFO"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              level === "INFO" ? "bg-blue-500 text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Info
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-zinc-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Level</th>
                <th className="py-3 px-3">Service</th>
                <th className="py-3 px-4">Message & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500 font-sans">
                    No system logs match current filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString()} ({formatTimeAgo(log.createdAt)})
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.level === "ERROR" || log.level === "FATAL"
                            ? "bg-rose-500/20 text-rose-400"
                            : log.level === "WARN"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-zinc-200">
                      {log.service}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      <p className="font-sans text-xs">{log.message}</p>
                      {log.metadata && (
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5 max-w-xl">
                          {log.metadata}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
