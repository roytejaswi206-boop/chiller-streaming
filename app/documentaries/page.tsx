import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";

export const dynamic = "force-dynamic";

export default async function DocumentariesPage() {
  const initialRes = await discoverContent({
    category: "documentary",
    mediaType: "movie",
    page: 1,
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-6">
        <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider">
              Real Stories & Facts
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Documentaries & True Stories
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Inspiring true accounts, nature chronicles, scientific investigations, and biographical exposés.
          </p>
        </div>

        <InfiniteMediaGrid
          initialItems={initialRes.items}
          initialHasNextPage={initialRes.hasNextPage}
          query={{
            category: "documentary",
            mediaType: "movie",
          }}
        />
      </main>
    </div>
  );
}
