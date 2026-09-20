import React from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaRail } from "@/components/video/InfiniteMediaRail";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";

export const dynamic = "force-dynamic";

interface CalendarPageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { type = "all" } = await searchParams;

  const initialRes = await discoverContent({
    category: "upcoming",
    mediaType: type === "series" ? "tv" : type === "anime" ? "anime" : "movie",
    page: 1,
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-8">
        {/* Calendar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30 text-[10px] font-black uppercase tracking-wider">
                Release Schedule
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Release Calendar & Upcoming
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Discover upcoming theatrical releases, season premieres, and scheduled episodes.
            </p>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#0F172A] p-1.5 rounded-2xl border border-white/10 shrink-0">
            {[
              { label: "All Upcoming", value: "all", href: "/calendar" },
              { label: "Movies", value: "movie", href: "/calendar?type=movie" },
              { label: "Series", value: "series", href: "/calendar?type=series" },
              { label: "Anime", value: "anime", href: "/calendar?type=anime" },
            ].map((tab) => {
              const active = type === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={tab.href}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    active
                      ? "bg-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Rails Breakdown */}
        {type === "all" && (
          <>
            <InfiniteMediaRail
              title="Upcoming Movies (Theatrical & Streaming)"
              query={{ category: "upcoming", mediaType: "movie" }}
              seeAllHref="/calendar?type=movie"
              layout="poster"
              badge="#UPCOMING"
            />

            <InfiniteMediaRail
              title="Currently Airing TV Series"
              query={{ category: "on_the_air", mediaType: "tv" }}
              seeAllHref="/calendar?type=series"
              layout="poster"
              badge="#AIRING"
            />

            <InfiniteMediaRail
              title="Upcoming Anime (Next Season)"
              query={{ mediaType: "anime", category: "popular" }}
              seeAllHref="/calendar?type=anime"
              layout="poster"
              badge="AniList"
            />
          </>
        )}

        {/* Filtered Grid View */}
        {type !== "all" && (
          <InfiniteMediaGrid
            initialItems={initialRes.items}
            initialHasNextPage={initialRes.hasNextPage}
            query={{
              category: "upcoming",
              mediaType: type === "series" ? "tv" : type === "anime" ? "anime" : "movie",
            }}
          />
        )}
      </main>
    </div>
  );
}
