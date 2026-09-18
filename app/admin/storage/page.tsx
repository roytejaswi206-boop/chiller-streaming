import { prisma } from "@/lib/prisma";
import { formatBytes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminStoragePage() {
  const [totalVideos, totalStorageAgg] = await Promise.all([
    prisma.video.count(),
    prisma.video.aggregate({ _sum: { fileSize: true } }),
  ]);

  const totalBytes = totalStorageAgg._sum.fileSize || BigInt(0);
  const totalGb = Number(totalBytes) / (1024 * 1024 * 1024);
  const provider = process.env.STORAGE_PROVIDER || "local";
  const localStoragePath = process.env.LOCAL_STORAGE_PATH || "./media_storage";
  const isS3Configured = Boolean(process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY);

  // Cloud estimate comparison ($0.015/GB/mo for S3/R2 vs $0 for local disk)
  const estimatedCloudMonthly = (totalGb * 0.015).toFixed(2);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Storage Architecture & Media Pools
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Self-hosted local disk paths, S3/R2 abstractions, and capacity awareness
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Active Provider
          </span>
          <span className="text-xl font-bold text-white uppercase font-mono">
            {provider} (Free / Self-Hosted)
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Total Media Size
          </span>
          <span className="text-xl font-bold text-rose-400">
            {formatBytes(totalBytes)}
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Total Files Indexed
          </span>
          <span className="text-xl font-bold text-white">
            {totalVideos} masters
          </span>
        </div>
      </div>

      {/* Storage Provider Details */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-xl space-y-4 mb-8">
        <h3 className="text-sm font-bold text-white">Storage Provider Configuration</h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <span className="text-zinc-400">Local Disk Storage Path:</span>
            <span className="font-mono text-emerald-400 font-bold">
              {localStoragePath}
            </span>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <span className="text-zinc-400">AWS S3 / Cloudflare R2 Connection:</span>
            <span className={`font-bold ${isS3Configured ? "text-emerald-400" : "text-amber-400 font-mono"}`}>
              {isS3Configured ? "CONFIGURED & CONNECTED" : "NOT CONFIGURED (Using Free Local Storage)"}
            </span>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <span className="text-zinc-400">Target S3 Bucket:</span>
            <span className="font-mono text-zinc-300">
              {process.env.STORAGE_BUCKET || "velora-production-media-us (Unconnected)"}
            </span>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <span className="text-zinc-400">Media Subdirectory Layout:</span>
            <span className="font-mono text-zinc-400">
              originals/, hls/, thumbnails/, posters/, subtitles/
            </span>
          </div>
        </div>
      </div>

      {/* Cost Transparency Box */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Infrastructure Cost Awareness</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400">
            ESTIMATED
          </span>
        </div>
        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Self-hosted local disk storage costs <span className="text-emerald-400 font-bold">$0.00 in SaaS fees</span>.
          For comparison, storing this media catalog ({totalGb.toFixed(2)} GB) in commercial cloud object storage (AWS S3 or Cloudflare R2) would cost approximately:
        </p>
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
          <span className="text-xs text-zinc-300">Commercial Cloud Object Storage Estimate:</span>
          <span className="text-lg font-black text-amber-400 font-mono">
            ~${estimatedCloudMonthly} / month
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-2 font-mono">
          * ESTIMATED based on average S3/R2 pricing ($0.015/GB/mo). Not an actual bill. Local storage is 100% free.
        </p>
      </div>
    </div>
  );
}
