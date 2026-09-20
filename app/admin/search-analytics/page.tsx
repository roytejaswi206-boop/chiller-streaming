import React from "react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSearchAnalyticsPage() {
  const searchEvents = await prisma.searchEvent.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  const totalSearches = searchEvents.length;
  const zeroResultSearches = searchEvents.filter((s) => s.resultCount === 0);

  // Group queries to compute frequency
  const frequencyMap: Record<string, number> = {};
  searchEvents.forEach((s) => {
    const q = s.query.toLowerCase().trim();
    frequencyMap[q] = (frequencyMap[q] || 0) + 1;
  });

  const topQueries = Object.entries(frequencyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="border-b border-white/10 pb-6">
        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20">
          Discovery Intelligence
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight mt-1">
          Search Analytics & Discovery Demand
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Monitor user search intent, trending keywords, and zero-result discovery gaps.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Recorded Searches
          </span>
          <span className="text-2xl font-black text-white font-mono">{totalSearches}</span>
          <p className="text-[11px] text-zinc-500 mt-2">Real user query events</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Zero-Result Queries
          </span>
          <span className="text-2xl font-black text-rose-400 font-mono">
            {zeroResultSearches.length}
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">Searches yielding no metadata</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Top Search Query
          </span>
          <span className="text-xl font-black text-[#FF3B6B] truncate block">
            {topQueries[0] ? topQueries[0][0] : "None yet"}
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">
            {topQueries[0] ? `${topQueries[0][1]} requests` : "Awaiting search traffic"}
          </p>
        </div>
      </div>

      {/* Top Search Queries Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white">Most Searched Terms</h3>
        {topQueries.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">
            No search telemetry recorded yet. Search events are logged as visitors discover titles.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {topQueries.map(([query, count], idx) => (
              <div key={query} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center font-mono text-zinc-500 font-bold">
                    #{idx + 1}
                  </span>
                  <span className="text-white font-semibold font-mono">{query}</span>
                </div>
                <span className="text-zinc-400 font-mono">{count} searches</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
