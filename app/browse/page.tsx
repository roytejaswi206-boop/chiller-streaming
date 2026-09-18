import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { VideoCard } from "@/components/video/VideoCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface BrowsePageProps {
  searchParams: Promise<{
    category?: string;
    duration?: string;
    quality?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const { category, duration, quality, sort = "newest", page = "1" } = await searchParams;

  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 15;
  const skip = (pageNumber - 1) * pageSize;

  // Build filter query
  const where: any = {
    status: "READY",
  };

  if (category) {
    where.category = { slug: category };
  }

  if (quality) {
    where.resolution = quality;
  }

  if (duration === "short") {
    // Under 10 minutes
    where.duration = { lte: 600 };
  } else if (duration === "medium") {
    // 10 to 30 minutes
    where.duration = { gte: 600, lte: 1800 };
  } else if (duration === "long") {
    // Over 30 minutes
    where.duration = { gte: 1800 };
  }

  // Build orderBy
  let orderBy: any = { createdAt: "desc" };
  if (sort === "popular" || sort === "views") {
    orderBy = { views: "desc" };
  } else if (sort === "duration") {
    orderBy = { duration: "desc" };
  }

  const [videos, totalCount, categories] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: { category: true },
    }),
    prisma.video.count({ where }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090c]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Browse Videos
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Showing {videos.length} of {totalCount} videos
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/browse"
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                !category && !sort && !quality && !duration
                  ? "bg-[#FF3864] text-white"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300"
              }`}
            >
              All
            </Link>
            <Link
              href="/browse?sort=popular"
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                sort === "popular"
                  ? "bg-[#FF3864] text-white"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300"
              }`}
            >
              Most Viewed
            </Link>
            <Link
              href="/browse?duration=short"
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                duration === "short"
                  ? "bg-[#FF3864] text-white"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300"
              }`}
            >
              &lt; 10 Mins
            </Link>
            <Link
              href="/browse?duration=long"
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                duration === "long"
                  ? "bg-[#FF3864] text-white"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300"
              }`}
            >
              30+ Mins
            </Link>
            <Link
              href="/browse?quality=4K"
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                quality === "4K"
                  ? "bg-[#FF3864] text-white"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300"
              }`}
            >
              4K Ultra
            </Link>
          </div>
        </div>

        {/* Categories Horizontal Quick-Filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/browse?category=${cat.slug}`}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition border ${
                category === cat.slug
                  ? "border-[#FF3864] bg-[#FF3864]/10 text-rose-300"
                  : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#121218] p-12 text-center my-8">
            <p className="text-zinc-400 text-sm font-semibold mb-2">No videos found</p>
            <p className="text-zinc-500 text-xs mb-4">Try adjusting your filters or category selection.</p>
            <Link
              href="/browse"
              className="inline-block py-2 px-4 rounded-xl velora-gradient text-white text-xs font-bold"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                id={video.id}
                slug={video.slug}
                title={video.title}
                thumbnailUrl={video.thumbnailUrl}
                duration={video.duration}
                views={video.views}
                createdAt={video.createdAt}
                resolution={video.resolution}
                category={video.category}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12 mb-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/browse?page=${p}${category ? `&category=${category}` : ""}${
                  sort ? `&sort=${sort}` : ""
                }`}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                  pageNumber === p
                    ? "bg-[#FF3864] text-white"
                    : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
