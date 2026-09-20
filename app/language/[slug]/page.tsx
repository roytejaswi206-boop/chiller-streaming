import React from "react";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";

export const dynamic = "force-dynamic";

const LANGUAGE_MAP: Record<string, { code: string; name: string }> = {
  hindi: { code: "hi", name: "Hindi" },
  english: { code: "en", name: "English" },
  japanese: { code: "ja", name: "Japanese" },
  korean: { code: "ko", name: "Korean" },
  chinese: { code: "zh", name: "Chinese" },
  spanish: { code: "es", name: "Spanish" },
  french: { code: "fr", name: "French" },
  bengali: { code: "bn", name: "Bengali" },
  assamese: { code: "as", name: "Assamese" },
};

interface LanguagePageProps {
  params: Promise<{ slug: string }>;
}

export default async function LanguagePage({ params }: LanguagePageProps) {
  const { slug } = await params;
  const config = LANGUAGE_MAP[slug.toLowerCase()];

  if (!config) {
    notFound();
  }

  const initialRes = await discoverContent({
    language: config.code,
    page: 1,
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-6">
        <div className="border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30 text-[10px] font-black uppercase tracking-wider">
              Language Explorer
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {config.name} Content
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Discover films, series, and animation originally produced in {config.name}.
          </p>
        </div>

        <InfiniteMediaGrid
          initialItems={initialRes.items}
          initialHasNextPage={initialRes.hasNextPage}
          query={{
            language: config.code,
          }}
        />
      </main>
    </div>
  );
}
