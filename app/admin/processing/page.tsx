import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatTimeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProcessingPage() {
  const jobs = await prisma.processingJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { video: true },
  });

  const queuedCount = jobs.filter((j) => j.status === "QUEUED").length;
  const activeCount = jobs.filter((j) => ["PROCESSING", "TRANSCODING", "PACKAGING"].includes(j.status)).length;
  const failedCount = jobs.filter((j) => j.status === "FAILED").length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Video Processing Center
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time FFmpeg transcoding pipeline & HLS packaging queue
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/upload"
            className="py-2 px-4 rounded-xl velora-gradient text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:opacity-90 transition"
          >
            + New Ingestion Job
          </Link>
        </div>
      </div>

      {/* Queue Status Pills */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Queued
          </span>
          <span className="text-2xl font-black text-amber-400">{queuedCount}</span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Active Workers
          </span>
          <span className="text-2xl font-black text-rose-400">{activeCount}</span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Failed Jobs
          </span>
          <span className="text-2xl font-black text-red-400">{failedCount}</span>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 bg-black/30 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Real Transcoding Pipeline ({jobs.length} Jobs Recorded)
          </h3>
          <span className="text-[11px] text-zinc-500 font-mono">
            Worker: embedded-ffmpeg
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/20 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-3">Video Title</th>
                <th className="py-3 px-3">Job Type</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Progress</th>
                <th className="py-3 px-3">Worker ID</th>
                <th className="py-3 px-3">Started</th>
                <th className="py-3 px-4">Error Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    No active or historical processing jobs found.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      {job.id.slice(0, 10)}...
                    </td>
                    <td className="py-3 px-3 font-bold text-white max-w-xs truncate">
                      {job.video?.title || "Video #" + job.videoId.slice(0, 6)}
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-400">
                      {job.type}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          job.status === "READY"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : job.status === "FAILED"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-24 bg-black/60 rounded-full h-2 overflow-hidden border border-white/10">
                        <div
                          className="bg-[#FF3864] h-full"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 mt-0.5 block">
                        {job.progress.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-500 text-[11px]">
                      {job.workerId || "worker-default"}
                    </td>
                    <td className="py-3 px-3 text-zinc-400 text-[11px]">
                      {formatTimeAgo(job.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-rose-400 text-[11px] max-w-xs truncate">
                      {job.errorMessage || "—"}
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
