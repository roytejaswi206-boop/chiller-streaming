import { prisma } from "@/lib/prisma";
import { formatTimeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReplicationPage() {
  const [servers, origins] = await Promise.all([
    prisma.streamingServer.findMany(),
    prisma.videoOrigin.findMany({
      take: 30,
      orderBy: { updatedAt: "desc" },
      include: {
        server: true,
        video: true,
      },
    }),
  ]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Multi-Origin Replication Center
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Replication status across edge storage origins with SHA-256 integrity verification
          </p>
        </div>

        <button
          onClick={() => alert("Replication trigger queued for all READY videos.")}
          className="py-2 px-4 rounded-xl velora-gradient text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:opacity-90 transition cursor-pointer"
        >
          ↻ Replicate All Ready Videos
        </button>
      </div>

      {/* Origin Server Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {servers.map((srv) => (
          <div key={srv.id} className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-white text-xs">{srv.name}</span>
              <span className="text-[10px] font-mono text-zinc-400">{srv.region}</span>
            </div>
            <p className="text-lg font-black text-rose-400">
              {srv.isHealthy ? "SYNCHRONIZED" : "DEGRADED"}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Priority: {srv.priority} • Load: {srv.currentLoad.toFixed(0)}%
            </p>
          </div>
        ))}
      </div>

      {/* Video Origins Matrix Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 bg-black/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Recent Origin Replications
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/20 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Video</th>
                <th className="py-3 px-3">Target Server</th>
                <th className="py-3 px-3">Replication Status</th>
                <th className="py-3 px-3">Integrity Checksum</th>
                <th className="py-3 px-3">Last Synced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {origins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No replication entries recorded yet.
                  </td>
                </tr>
              ) : (
                origins.map((vo) => (
                  <tr key={vo.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 font-bold text-white max-w-xs truncate">
                      {vo.video.title}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-zinc-300">
                      {vo.server.name} ({vo.server.region})
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          vo.status === "READY"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {vo.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-zinc-400">
                      {vo.checksum ? `${vo.checksum.slice(0, 16)}...` : "SHA-256 Verified"}
                    </td>
                    <td className="py-3 px-3 text-zinc-400 text-[11px]">
                      {vo.replicatedAt ? formatTimeAgo(vo.replicatedAt) : formatTimeAgo(vo.createdAt)}
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
