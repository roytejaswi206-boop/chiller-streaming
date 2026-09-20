import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { GENRE_SLUG_MAP } from "@/lib/content/discovery";

export const dynamic = "force-dynamic";

interface GenrePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string; sort?: string }>;
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  const { type = "all", sort = "popularity.desc" } = await searchParams;

  const normalizedSlug = slug.toLowerCase();
  const genreMeta = GENRE_SLUG_MAP[normalizedSlug];

  // If completely unknown slug, check if capital or dashed
  const genreTitle = genreMeta?.name || normalizedSlug.charAt(0).toUpperCase() + normalizedSlug.slice(1);

  const mediaType = (type === "movie" || type === "tv" || type === "anime" ? type : undefined) as any;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {/* Genre Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-[#181824] via-[#12121A] to-[#09090C] p-6 lg:p-10 mb-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#FF3B6B]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF3B6B]">
              Genre Exploration
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 mb-2">
              {genreTitle}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
              Browse thousands of {genreTitle.toLowerCase()} movies, series, and anime. Continuously discovery powered by the Chiller Engine.
            </p>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Media Type Filter */}
              <div className="flex items-center p-1 rounded-xl bg-black/50 border border-white/10 text-xs">
                {[
                  { label: "All", val: "all" },
                  { label: "Movies", val: "movie" },
                  { label: "Series", val: "tv" },
                  { label: "Anime", val: "anime" },
                ].map((item) => (
                  <Link
                    key={item.val}
                    href={`/genre/${slug}?type=${item.val}&sort=${sort}`}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      type === item.val
                        ? "bg-[#FF3B6B] text-white shadow-md shadow-[#FF3B6B]/20"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Sort Filter */}
              <div className="flex items-center p-1 rounded-xl bg-black/50 border border-white/10 text-xs">
                {[
                  { label: "Most Popular", val: "popularity.desc" },
                  { label: "Highest Rated", val: "vote_average.desc" },
                  { label: "Newest Releases", val: "primary_release_date.desc" },
                ].map((item) => (
                  <Link
                    key={item.val}
                    href={`/genre/${slug}?type=${type}&sort=${item.val}`}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      sort === item.val
                        ? "bg-white/15 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Infinite Media Grid for Genre */}
        <InfiniteMediaGrid
          query={{
            genre: normalizedSlug,
            mediaType,
            sort,
          }}
          emptyTitle={`No ${genreTitle} titles found.`}
          emptySubtitle="Try selecting a different content type or filter."
        />
      </main>
    </div>
  );
}
