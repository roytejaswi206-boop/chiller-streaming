import { Sidebar } from "@/components/layout/Sidebar";
import { VideoCard } from "@/components/video/VideoCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewReleasesPage() {
  const videos = await prisma.video.findMany({
    where: { status: "READY" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { category: true },
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090c]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            New Releases
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Fresh scenes and uncensored stories uploaded recently
          </p>
        </div>

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
      </main>
    </div>
  );
}
