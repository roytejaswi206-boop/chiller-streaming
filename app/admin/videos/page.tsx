import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDuration, formatTimeAgo, formatViews } from "@/lib/utils";
import { VideoRowActions } from "@/components/admin/VideoRowActions";

export const dynamic = "force-dynamic";

interface AdminVideosPageProps {
  searchParams: Promise<{ page?: string; q?: string; status?: string; visibility?: string; source?: string }>;
}

export default async function AdminVideosPage({ searchParams }: AdminVideosPageProps) {
  const { page = "1", q = "", status, visibility, source } = await searchParams;
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 20;
  const skip = (pageNumber - 1) * pageSize;

  const where: any = {};
  if (q.trim()) {
    where.title = { contains: q.trim() };
  }
  if (status) {
    where.status = status;
  }
  if (visibility) {
    where.visibility = visibility;
  }
  if (source) {
    where.source = source;
  }

  const [videos, totalCount] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        category: true,
        origins: { include: { server: true } },
      },
    }),
    prisma.video.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Video Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Total {totalCount} videos registered in the platform catalog
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/telegram"
            className="py-2 px-4 rounded-xl bg-sky-600/20 border border-sky-500/30 text-sky-300 text-xs font-bold hover:bg-sky-600/30 transition flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.05-.2-.06-.05-.16-.03-.23-.02-.1.02-1.74 1.11-4.92 3.26-.47.32-.89.48-1.28.47-.42-.01-1.24-.24-1.84-.44-.75-.24-1.34-.37-1.29-.79.03-.22.33-.44.91-.68 3.56-1.55 5.94-2.57 7.14-3.07 3.4-.1.42 4.1.49 4.14.49.04 0 .09.01.12.01.03.02.08.06.1.1.02.04.03.11.02.19z" />
            </svg>
            Telegram Ingestion
          </Link>
          <Link
            href="/admin/upload"
            className="py-2 px-4 rounded-xl velora-gradient text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:opacity-90 transition"
          >
            + New Video Upload
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl border border-white/10 bg-[#12121a] mb-6">
        <form action="/admin/videos" method="GET" className="w-full sm:w-80">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Filter by title..."
            className="w-full h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3864]"
          />
        </form>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Link
            href="/admin/videos"
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              !status && !visibility && !source ? "bg-[#FF3864] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            All ({totalCount})
          </Link>
          <Link
            href="/admin/videos?source=TELEGRAM"
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
              source === "TELEGRAM" ? "bg-sky-500 text-white" : "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
            }`}
          >
            Telegram
          </Link>
          <Link
            href="/admin/videos?source=BROWSER"
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              source === "BROWSER" ? "bg-[#FF3864] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Browser
          </Link>
          <Link
            href="/admin/videos?source=FOLDER_IMPORT"
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              source === "FOLDER_IMPORT" ? "bg-purple-600 text-white" : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
            }`}
          >
            Folder
          </Link>
          <Link
            href="/admin/videos?status=READY"
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              status === "READY" ? "bg-[#FF3864] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Ready
          </Link>
          <Link
            href="/admin/videos?status=PROCESSING"
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              status === "PROCESSING" ? "bg-[#FF3864] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Processing
          </Link>
          <Link
            href="/admin/videos?visibility=PREMIUM"
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              visibility === "PREMIUM" ? "bg-[#FF3864] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Premium
          </Link>
        </div>
      </div>

      {/* Videos Data Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Video</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Storage</th>
                <th className="py-3 px-3">Quality</th>
                <th className="py-3 px-3">Visibility</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Views</th>
                <th className="py-3 px-3">Added</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {videos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-zinc-500">
                    No videos match your search or filter.
                  </td>
                </tr>
              ) : (
                videos.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.02] transition">
                    {/* Thumbnail & Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                          <img
                            src={v.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="max-w-xs">
                          <Link
                            href={`/watch/${v.slug}`}
                            target="_blank"
                            className="font-bold text-white hover:text-rose-300 transition truncate block"
                          >
                            {v.title}
                          </Link>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {v.publicId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Source */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          v.source === "TELEGRAM"
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : v.source === "FOLDER_IMPORT"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : "bg-white/5 text-zinc-400 border border-white/10"
                        }`}
                      >
                        {v.source === "TELEGRAM" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                        )}
                        {v.source || "BROWSER"}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] font-medium text-zinc-300">
                        {v.category?.name || "Uncategorized"}
                      </span>
                    </td>

                    {/* Storage Size */}
                    <td className="py-3 px-3 font-mono text-zinc-400">
                      {formatBytes(v.fileSize)}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[10px] font-extrabold uppercase text-zinc-300">
                        {v.resolution}
                      </span>
                    </td>

                    {/* Visibility */}
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.visibility === "PUBLIC"
                            ? "bg-blue-500/20 text-blue-300"
                            : v.visibility === "PREMIUM"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-zinc-500/20 text-zinc-400"
                        }`}
                      >
                        {v.visibility}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.status === "READY"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : v.status === "FAILED"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-bold text-zinc-200">
                      {formatViews(v.views)}
                    </td>

                    <td className="py-3 px-3 text-zinc-400 text-[11px]">
                      {formatTimeAgo(v.createdAt)}
                    </td>

                    {/* Interactive Actions */}
                    <td className="py-3 px-4 text-right">
                      <VideoRowActions
                        videoId={v.id}
                        publicId={v.publicId}
                        slug={v.slug}
                        isPublished={v.isPublished}
                        status={v.status}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20 text-xs text-zinc-400">
            <span>
              Page {pageNumber} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/admin/videos?page=${p}${q ? `&q=${q}` : ""}${
                    status ? `&status=${status}` : ""
                  }`}
                  className={`w-7 h-7 rounded flex items-center justify-center font-bold ${
                    pageNumber === p
                      ? "bg-[#FF3864] text-white"
                      : "bg-white/5 hover:bg-white/10 text-zinc-300"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
