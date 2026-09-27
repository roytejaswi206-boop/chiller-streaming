import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";
import { getCanonicalUrl } from "@/lib/config/site";
import { JsonLd, buildCollectionSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Releases | Movies & Series | CHILLER",
  description: "Freshly added movies, series, and anime episodes available to watch now on CHILLER in crystal-clear HD.",
  alternates: {
    canonical: getCanonicalUrl("/new"),
  },
  openGraph: {
    title: "New Releases | Movies & Series | CHILLER",
    description: "Freshly added movies, series, and anime episodes available to watch now on CHILLER.",
    url: getCanonicalUrl("/new"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "New Releases on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "New Releases | Movies & Series | CHILLER",
    description: "Freshly added movies, series, and anime episodes on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
};

export default async function NewReleasesPage() {
  const initialRes = await discoverContent({
    category: "now_playing",
    mediaType: "movie",
    page: 1,
  }).catch(() => ({ items: [], totalPages: 1, totalResults: 0, hasNextPage: false }));

  const collectionSchema = buildCollectionSchema(
    "New Releases",
    "Freshly released movies, episodes, and newest additions available to stream now on CHILLER.",
    "/new"
  );
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: getCanonicalUrl("/") },
    { name: "New Releases", url: getCanonicalUrl("/new") },
  ]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090c]">
      <JsonLd schema={[collectionSchema, breadcrumbSchema]} />
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-6">
        <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30 text-[10px] font-black uppercase tracking-wider">
              Fresh In Cinema & Streaming
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            New Releases
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Recently released blockbusters, latest season premieres, and freshly added titles ready to stream now.
          </p>
        </div>

        <InfiniteMediaGrid
          initialItems={initialRes.items}
          initialHasNextPage={initialRes.hasNextPage}
          query={{
            category: "now_playing",
            mediaType: "movie",
          }}
        />
      </main>
    </div>
  );
}
