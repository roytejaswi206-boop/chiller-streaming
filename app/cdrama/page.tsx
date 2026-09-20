import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";

export const dynamic = "force-dynamic";

export default async function CDramaPage() {
  const initialRes = await discoverContent({
    category: "cdrama",
    language: "zh",
    country: "CN",
    mediaType: "tv",
    page: 1,
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
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
