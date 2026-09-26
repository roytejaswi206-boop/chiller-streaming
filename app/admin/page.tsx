import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatViews } from "@/lib/utils";
import { SuperAdminDashboard } from "@/components/admin/SuperAdminDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Super Admin Dashboard • CHILLER",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AdminOverviewPage() {
  // Query real database metrics for video inventory and jobs
  const [
    totalVideos,
    readyVideos,
    processingVideos,
    failedVideos,
    totalViewsAgg,
    recentJobs,
    servers,
  ] = await Promise.all([
    prisma.video.count(),
    prisma.video.count({ where: { status: "READY" } }),
    prisma.video.count({ where: { status: { in: ["PROCESSING", "TRANSCODING", "PACKAGING", "QUEUED"] } } }),
    prisma.video.count({ where: { status: "FAILED" } }),
    prisma.video.aggregate({ _sum: { views: true } }),
    prisma.processingJob.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { video: true },
    }),
    prisma.streamingServer.findMany(),
  ]);

  const totalViews = totalViewsAgg._sum.views || 0;

  // Real storage usage calculation
  const storageAgg = await prisma.video.aggregate({ _sum: { fileSize: true } });
  const totalStorageBytes = storageAgg._sum.fileSize || BigInt(0);

  // Connected providers check
  const isPaymentConnected = Boolean(process.env.STRIPE_SECRET_KEY || process.env.CCBILL_ACCOUNT_NUMBER);
  const isStorageS3 = process.env.STORAGE_PROVIDER === "s3";

  return (
    <div className="space-y-8">
      {/* Super Admin Interactive Operations Dashboard */}
      <SuperAdminDashboard />

      {/* Media Catalog & File Storage Overview */}
      <div className="pt-6 border-t border-white/10 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Media Inventory & Storage Fleet
          </h2>
          <p className="text-xs text-zinc-400">
            Physical media files, video transcoding pipeline, and origin replication status
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Catalog Media Masters
            </span>
            <span className="text-2xl font-black text-white font-mono">{totalVideos}</span>
            <div className="flex items-center gap-2 mt-2 text-[11px]">
              <span className="text-emerald-400 font-bold">{readyVideos} Ready</span>
              {processingVideos > 0 && (
                <span className="text-amber-400 font-bold">• {processingVideos} In Queue</span>
              )}
              {failedVideos > 0 && (
                <span className="text-rose-400 font-bold">• {failedVideos} Failed</span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Storage Footprint
            </span>
            <span className="text-2xl font-black text-white font-mono">{formatBytes(totalStorageBytes)}</span>
            <p className="text-[11px] text-zinc-500 mt-2">
              Provider: <span className="text-zinc-300 font-semibold">{isStorageS3 ? "AWS S3 / R2" : "Local Disk"}</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Indexed Views
            </span>
            <span className="text-2xl font-black text-rose-400 font-mono">{formatViews(totalViews)}</span>
            <p className="text-[11px] text-zinc-500 mt-2">
              Catalog stream counts
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Origin Servers
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{servers.length}</span>
            <p className="text-[11px] text-zinc-500 mt-2">
              Edge streaming nodes
            </p>
          </div>
        </div>

        {/* Second Row: Revenue & Processing Queue */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue Telemetry Card */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">Monetization Telemetry</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isPaymentConnected
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/5 text-zinc-500 border border-white/10"
                  }`}
                >
                  {isPaymentConnected ? "GATEWAY CONNECTED" : "DATA NOT CONNECTED"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                External payment gateway telemetry (Stripe / CCBill)
              </p>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center">
                {isPaymentConnected ? (
                  <div className="text-xl font-bold text-white font-mono">$0.00 USD</div>
                ) : (
                  <div className="text-xs font-mono text-zinc-500 py-2">
                    PAYMENT GATEWAY NOT CONNECTED
                  </div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 mt-4">
              Ad revenue telemetry not connected (Adsterra external revenue API requires authorized partner key).
            </p>
          </div>

          {/* Transcoding Queue */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">Recent Processing Jobs</h3>
                <Link
                  href="/admin/processing"
                  className="text-[11px] font-bold text-[#FF3B6B] hover:underline"
                >
                  View Queue →
                </Link>
              </div>
              <p className="text-xs text-zinc-400 mb-3">
                FFmpeg video transcoding & packaging tasks
              </p>

              {recentJobs.length === 0 ? (
                <div className="p-6 rounded-xl bg-black/40 border border-white/5 text-center text-xs text-zinc-500">
                  Zero active background transcode tasks.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-white truncate max-w-[200px]">
                        {job.video?.title || job.id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400">
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
