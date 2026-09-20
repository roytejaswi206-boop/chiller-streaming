import React from "react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPerformancePage() {
  // Test Database Query Latency
  const dbStart = Date.now();
  await prisma.video.findFirst({ select: { id: true } });
  const dbLatencyMs = Date.now() - dbStart;

  return (
    <div className="space-y-8">
      <div className="border-b border-white/10 pb-6">
        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
          Latency & Optimization
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight mt-1">
          Performance & Latency Center
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Measure database query timings, external discovery response latency, and streaming origin performance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Database Query Latency
          </span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            {dbLatencyMs} ms
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">Local SQLite query execution</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Cache Lookup Target
          </span>
          <span className="text-2xl font-black text-sky-400 font-mono">
            &lt; 1 ms
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">In-memory LRU cache retrieval</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Playback Timeout Budget
          </span>
          <span className="text-2xl font-black text-purple-400 font-mono">
            5,000 ms
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">Maximum provider resolution window</p>
        </div>
      </div>

      {/* Latency Benchmarks */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 space-y-4">
        <h3 className="text-sm font-bold text-white">System Benchmark Standards</h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
            <div>
              <span className="font-bold text-white block">Server-Side Rendered Routes (SSR)</span>
              <span className="text-[11px] text-zinc-500">Home, Movies, Series, Detail pages</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
              Target: &lt; 250ms
            </span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
            <div>
              <span className="font-bold text-white block">Discovery Cache Hit Latency</span>
              <span className="text-[11px] text-zinc-500">Horizontal rails and infinite paginated grids</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
              Target: &lt; 20ms
            </span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
            <div>
              <span className="font-bold text-white block">Playback Candidate Resolution</span>
              <span className="text-[11px] text-zinc-500">Concurrent multi-provider candidate testing</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">
              Target: &lt; 1,200ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
