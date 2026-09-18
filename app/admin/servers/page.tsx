import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminServersPage() {
  const servers = await prisma.streamingServer.findMany({
    include: {
      origins: {
        where: { status: "READY" },
      },
    },
    orderBy: { priority: "asc" },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Origin Server Fleet Monitoring
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Genuinely verified edge origins, live HTTP latency pings, and replication health
          </p>
        </div>
        <form action="/api/admin/servers/ping" method="POST">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF3864] hover:bg-[#ff1f52] text-white transition shadow-lg shadow-rose-900/20"
          >
            Ping All Origins Now
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {servers.map((srv) => {
          const isOnline = srv.status === "ONLINE";
          const isConfigured = srv.status !== "NOT_CONFIGURED";

          const statusColor = isOnline
            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
            : srv.status === "UNREACHABLE"
            ? "text-red-400 bg-red-500/10 border-red-500/30"
            : "text-zinc-400 bg-white/5 border-white/10";

          return (
            <div
              key={srv.id}
              className="p-5 rounded-2xl border border-white/10 bg-[#12121a] shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOnline ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                    }`}
                  />
                  <h3 className="text-sm font-bold text-white">{srv.name}</h3>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statusColor}`}>
                  {srv.status}
                </span>
              </div>

              <div className="space-y-2 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Region:</span>
                  <span className="font-mono text-zinc-200">{srv.region}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-400">Measured Latency:</span>
                  <span className="font-mono font-bold text-white">
                    {srv.latencyMs > 0 ? `${srv.latencyMs.toFixed(0)} ms` : "UNKNOWN"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-400">Failures:</span>
                  <span className="font-mono text-zinc-400">{srv.failureCount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-400">Last Seen:</span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {srv.lastSeen ? new Date(srv.lastSeen).toLocaleTimeString() : "Never"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-400">Videos Hosted:</span>
                  <span className="font-mono font-bold text-rose-400">
                    {srv.origins.length} videos
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] text-[11px] font-mono text-zinc-500 truncate">
                {srv.endpoint || "No endpoint configured"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
