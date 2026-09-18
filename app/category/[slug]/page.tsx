import { notFound } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { VideoCard } from "@/components/video/VideoCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { page = "1", sort = "newest" } = await searchParams;

  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 15;
  const skip = (pageNumber - 1) * pageSize;

  let orderBy: any = { createdAt: "desc" };
  if (sort === "popular") {
    orderBy = { views: "desc" };
  }

  const [videos, totalCount] = await Promise.all([
    prisma.video.findMany({
      where: { categoryId: category.id, status: "READY" },
      orderBy,
      skip,
      take: pageSize,
      include: { category: true },
    }),
    prisma.video.count({
      where: { categoryId: category.id, status: "READY" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090c]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {/* Category Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-r from-[#181824] to-[#12121a] p-8 mb-8">
          <div className="relative z-10 max-w-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Category
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1 mb-2">
              {category.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
              {category.description || `Browse the best HD videos in ${category.name}.`}
            </p>
            <div className="text-xs text-zinc-400 font-semibold">
              {totalCount} {totalCount === 1 ? "Video" : "Videos"} Available
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="text-xs font-semibold text-zinc-400">
            Showing {videos.length} videos
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/category/${slug}?sort=newest`}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                sort === "newest"
                  ? "bg-[#FF3864] text-white"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300"
              }`}
            >
              Newest
            </Link>
            <Link
              href={`/category/${slug}?sort=popular`}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                sort === "popular"
                  ? "bg-[#FF3864] text-white"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300"
              }`}
            >
              Popular
            </Link>
          </div>
        </div>

        {/* Video Grid */}
        {videos.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#121218] p-12 text-center my-8">
            <p className="text-zinc-300 text-sm font-bold mb-1">No videos yet</p>
            <p className="text-zinc-500 text-xs mb-4">New content is being added daily.</p>
            <Link
              href="/browse"
              className="inline-block py-2 px-5 rounded-xl velora-gradient text-white text-xs font-bold"
            >
              Browse All Videos
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
                href={`/category/${slug}?page=${p}&sort=${sort}`}
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
