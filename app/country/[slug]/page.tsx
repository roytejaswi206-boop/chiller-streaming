import React from "react";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";

export const dynamic = "force-dynamic";

const COUNTRY_MAP: Record<string, { code: string; name: string; lang?: string }> = {
  india: { code: "IN", name: "Indian Cinema", lang: "hi" },
  usa: { code: "US", name: "United States (Hollywood)", lang: "en" },
  japan: { code: "JP", name: "Japanese Cinema & Anime", lang: "ja" },
  korea: { code: "KR", name: "Korean Entertainment", lang: "ko" },
  china: { code: "CN", name: "Chinese Cinema & Drama", lang: "zh" },
  uk: { code: "GB", name: "British Film & Series", lang: "en" },
  france: { code: "FR", name: "French Cinema", lang: "fr" },
  spain: { code: "ES", name: "Spanish Entertainment", lang: "es" },
};

interface CountryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CountryPage({ params }: CountryPageProps) {
  const { slug } = await params;
  const config = COUNTRY_MAP[slug.toLowerCase()];

  if (!config) {
    notFound();
  }

  const initialRes = await discoverContent({
    country: config.code,
    language: config.lang,
    page: 1,
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-6">
        <div className="border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30 text-[10px] font-black uppercase tracking-wider">
              Country Explorer
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {config.name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Explore authentic movies and television series originating from {config.name}.
          </p>
        </div>

        <InfiniteMediaGrid
          initialItems={initialRes.items}
          initialHasNextPage={initialRes.hasNextPage}
          query={{
            country: config.code,
            language: config.lang,
          }}
        />
      </main>
    </div>
  );
}
