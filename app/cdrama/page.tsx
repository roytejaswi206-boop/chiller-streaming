import React from "react";
import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";
import { getCanonicalUrl } from "@/lib/config/site";
import { JsonLd, buildCollectionSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "C-Drama | Chinese Dramas & Xianxia Epics | CHILLER",
  description: "Explore historical fantasies, martial arts epics, and modern romantic series from China on CHILLER in crystal-clear HD.",
  alternates: {
    canonical: getCanonicalUrl("/cdrama"),
  },
  openGraph: {
    title: "C-Drama | Chinese Dramas & Xianxia Epics | CHILLER",
    description: "Explore historical fantasies, martial arts epics, and modern romantic series from China on CHILLER.",
    url: getCanonicalUrl("/cdrama"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "C-Drama on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "C-Drama | Chinese Dramas & Xianxia Epics | CHILLER",
    description: "Explore historical fantasies, martial arts epics, and modern romantic series from China on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
};

export default async function CDramaPage() {
  const initialRes = await discoverContent({
    category: "cdrama",
    language: "zh",
    country: "CN",
    mediaType: "tv",
    page: 1,
  });

  const collectionSchema = buildCollectionSchema(
    "Chinese Dramas & Xianxia",
    "Explore historical fantasies, martial arts epics, and modern romantic series from China on CHILLER.",
    "/cdrama"
  );
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: getCanonicalUrl("/") },
    { name: "C-Drama", url: getCanonicalUrl("/cdrama") },
  ]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <JsonLd schema={[collectionSchema, breadcrumbSchema]} />
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-6">
        <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
              Chinese Drama & Xianxia
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            C-Drama Epics & Romances
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Historical fantasies, martial arts epics, and modern romances from China.
          </p>
        </div>

        <InfiniteMediaGrid
          initialItems={initialRes.items}
          initialHasNextPage={initialRes.hasNextPage}
          query={{
            category: "cdrama",
            language: "zh",
            country: "CN",
            mediaType: "tv",
          }}
        />
      </main>
    </div>
  );
}
