import React from "react";
import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";
import { getCanonicalUrl } from "@/lib/config/site";
import { JsonLd, buildCollectionSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kids & Family | Animation & Family Shows | CHILLER",
  description: "Watch family-friendly animation, cartoons, and adventurous series for all ages on CHILLER in HD.",
  alternates: {
    canonical: getCanonicalUrl("/kids"),
  },
  openGraph: {
    title: "Kids & Family | Animation & Family Shows | CHILLER",
    description: "Watch family-friendly animation, cartoons, and adventurous series for all ages on CHILLER.",
    url: getCanonicalUrl("/kids"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "Kids & Family on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kids & Family | Animation & Family Shows | CHILLER",
    description: "Watch family-friendly animation, cartoons, and adventurous series on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
};

export default async function KidsPage() {
  const initialRes = await discoverContent({
    category: "kids",
    mediaType: "tv",
    page: 1,
  });

  const collectionSchema = buildCollectionSchema(
    "Kids & Family Animation",
    "Watch family-friendly animation, cartoons, and adventurous series for all ages on CHILLER.",
    "/kids"
  );
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: getCanonicalUrl("/") },
    { name: "Kids", url: getCanonicalUrl("/kids") },
  ]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <JsonLd schema={[collectionSchema, breadcrumbSchema]} />
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-6">
        <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
              Family & Kids
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Kids & Cartoons
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Fun animated stories, family favorites, and adventures for all ages.
          </p>
        </div>

        <InfiniteMediaGrid
          initialItems={initialRes.items}
          initialHasNextPage={initialRes.hasNextPage}
          query={{
            category: "kids",
            mediaType: "tv",
          }}
        />
      </main>
    </div>
  );
}
