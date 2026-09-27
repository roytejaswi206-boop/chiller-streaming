import React from "react";
import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";
import { getCanonicalUrl } from "@/lib/config/site";
import { JsonLd, buildCollectionSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "K-Drama | Korean Dramas & Series | CHILLER",
  description: "Discover trending and top-rated Korean dramas on CHILLER. Explore romantic comedies, thrillers, and historical sagas in HD.",
  alternates: {
    canonical: getCanonicalUrl("/kdrama"),
  },
  openGraph: {
    title: "K-Drama | Korean Dramas & Series | CHILLER",
    description: "Discover trending and top-rated Korean dramas on CHILLER. Explore romantic comedies, thrillers, and historical sagas.",
    url: getCanonicalUrl("/kdrama"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "K-Drama on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "K-Drama | Korean Dramas & Series | CHILLER",
    description: "Discover trending and top-rated Korean dramas on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
};

export default async function KDramaPage() {
  const initialRes = await discoverContent({
    category: "kdrama",
    language: "ko",
    country: "KR",
    mediaType: "tv",
    page: 1,
  });

  const collectionSchema = buildCollectionSchema(
    "Korean Dramas & Series",
    "Discover trending and top-rated Korean dramas on CHILLER.",
    "/kdrama"
  );
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: getCanonicalUrl("/") },
    { name: "K-Drama", url: getCanonicalUrl("/kdrama") },
  ]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <JsonLd schema={[collectionSchema, breadcrumbSchema]} />
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-6">
        <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
              Korean Drama & Series
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            K-Drama Sensations
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Top-rated romantic comedies, suspense thrillers, and heartfelt sagas from South Korea.
          </p>
        </div>

        <InfiniteMediaGrid
          initialItems={initialRes.items}
          initialHasNextPage={initialRes.hasNextPage}
          query={{
            category: "kdrama",
            language: "ko",
            country: "KR",
            mediaType: "tv",
          }}
        />
      </main>
    </div>
  );
}
