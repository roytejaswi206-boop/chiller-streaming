import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { VideoCard } from "@/components/video/VideoCard";
import { prisma } from "@/lib/prisma";
import { getCanonicalUrl } from "@/lib/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top Rated Movies & Shows of All Time — Watch Beyond",
  description: "The highest-rated cinematic masterpieces and acclaimed series curated by global audience ratings on CHILLER.",
  alternates: {
    canonical: getCanonicalUrl("/top-rated"),
  },
  openGraph: {
    title: "CHILLER | Top Rated Movies & Shows",
    description: "The highest-rated cinematic masterpieces and acclaimed series on CHILLER.",
    url: getCanonicalUrl("/top-rated"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "Top Rated on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHILLER | Top Rated Movies & Shows",
    description: "The highest-rated cinematic masterpieces and acclaimed series on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
};

export default async function TopRatedPage() {
  const videos = await prisma.video.findMany({
    where: { status: "READY" },
    orderBy: [{ likes: "desc" }, { views: "desc" }],
    take: 20,
    include: { category: true },
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090c]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Top Rated Videos
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Highest-rated scenes and viewer favorites
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
