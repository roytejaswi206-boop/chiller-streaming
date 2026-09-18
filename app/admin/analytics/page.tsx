import { prisma } from "@/lib/prisma";
import { formatDuration, formatViews } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const [
    totalViewsAgg,
    totalWatchTimeAgg,
    topVideos,
    categories,
    recentViewEvents,
    activeServersCount,
  ] = await Promise.all([
    prisma.video.aggregate({ _sum: { views: true } }),
    prisma.video.aggregate({ _sum: { totalWatchTime: true } }),
    prisma.video.findMany({
      where: { status: "READY" },
      orderBy: { views: "desc" },
      take: 6,
      include: { category: true },
    }),
    prisma.category.findMany({
      orderBy: { videoCount: "desc" },
      take: 5,
    }),
    prisma.viewEvent.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { video: true },
    }),
    prisma.streamingServer.count({ where: { isEnabled: true } }),
  ]);

  const totalViews = totalViewsAgg._sum.views || 0;
  const totalWatchSec = Number(totalWatchTimeAgg._sum.totalWatchTime || 0);
  const avgWatchSec = totalViews > 0 ? Math.round(totalWatchSec / totalViews) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Platform Streaming Analytics
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Detailed viewer telemetry, retention metrics, and top performing content
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Total Views
          </span>
          <span className="text-2xl font-black text-white">{formatViews(totalViews)}</span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Total Watch Time
          </span>
          <span className="text-2xl font-black text-rose-400">
            {totalWatchSec >= 3600
              ? `${(totalWatchSec / 3600).toFixed(1)} hrs`
              : `${Math.round(totalWatchSec / 60)} mins`}
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Avg Watch Duration
          </span>
          <span className="text-2xl font-black text-white">
            {formatDuration(avgWatchSec)}
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Configured Origins
          </span>
          <span className="text-2xl font-black text-emerald-400">{activeServersCount} Servers</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Performing Videos */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">Top Performing Videos</h3>
          <div className="space-y-3">
            {topVideos.map((video, idx) => (
              <div
                key={video.id}
                className="flex items-center justify-between p-3 rounded-xl bg-black/30 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-zinc-500 w-4">
                    #{idx + 1}
                  </span>
                  <div className="w-12 aspect-video rounded overflow-hidden bg-black shrink-0">
                    <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="max-w-xs truncate">
                    <p className="font-bold text-white truncate">{video.title}</p>
                    <p className="text-[10px] text-zinc-400">{video.category?.name || "Uncategorized"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-rose-400 block">
                    {formatViews(video.views)}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {formatDuration(video.duration)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">Top Category Distribution</h3>
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-zinc-200">{cat.name}</span>
                  <span className="text-zinc-400 font-mono">{cat.videoCount} scenes</span>
                </div>
                <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#FF3864] h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(10, (cat.videoCount / 20) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
