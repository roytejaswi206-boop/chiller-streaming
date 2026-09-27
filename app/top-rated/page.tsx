import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";
import { getCanonicalUrl } from "@/lib/config/site";
import { JsonLd, buildCollectionSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top Rated Movies & Shows | CHILLER",
  description: "Discover the highest-rated cinematic masterpieces, acclaimed television series, and top-scoring anime curated on CHILLER in HD.",
  alternates: {
    canonical: getCanonicalUrl("/top-rated"),
  },
  openGraph: {
    title: "Top Rated Movies & Shows | CHILLER",
    description: "Discover the highest-rated cinematic masterpieces, acclaimed television series, and top-scoring anime curated on CHILLER.",
    url: getCanonicalUrl("/top-rated"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "Top Rated on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Top Rated Movies & Shows | CHILLER",
    description: "Discover the highest-rated cinematic masterpieces, acclaimed series, and top-scoring anime on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
};

export default async function TopRatedPage() {
  const initialRes = await discoverContent({
    category: "top_rated",
    mediaType: "movie",
    page: 1,
  }).catch(() => ({ items: [], totalPages: 1, totalResults: 0, hasNextPage: false }));

  const collectionSchema = buildCollectionSchema(
    "Top Rated Movies & Shows",
    "Discover the highest-rated cinematic masterpieces and acclaimed series on CHILLER.",
    "/top-rated"
  );
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: getCanonicalUrl("/") },
    { name: "Top Rated", url: getCanonicalUrl("/top-rated") },
  ]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090c]">
      <JsonLd schema={[collectionSchema, breadcrumbSchema]} />
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-6">
        <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
              Critical Acclaim
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Top Rated of All Time
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            The highest-rated cinematic triumphs, award-winning dramas, and beloved classics voted by global audiences.
          </p>
        </div>

        <InfiniteMediaGrid
          initialItems={initialRes.items}
          initialHasNextPage={initialRes.hasNextPage}
          query={{
            category: "top_rated",
            mediaType: "movie",
          }}
        />
      </main>
    </div>
  );
}
