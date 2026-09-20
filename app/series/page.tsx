import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChillerHero, HeroItem } from "@/components/video/ChillerHero";
import { InfiniteMediaRail } from "@/components/video/InfiniteMediaRail";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";

export const dynamic = "force-dynamic";

interface SeriesPageProps {
  searchParams: Promise<{ category?: string; genre?: string; view?: string }>;
}

export default async function SeriesPage({ searchParams }: SeriesPageProps) {
  const { category, genre, view } = await searchParams;

  // Pre-fetch top trending series for Hero
  const trendingRes = await discoverContent({
    category: "trending_tv",
    mediaType: "tv",
    timeWindow: "week",
    page: 1,
  });

  const trendingItems = trendingRes.items || [];

  const heroCandidates = trendingItems.filter(
    (item) => item.backdrop && !item.backdrop.includes("placeholder") && item.overview && item.overview.length > 20
  );
  const heroSource = heroCandidates.length >= 3 ? heroCandidates : trendingItems;
  const heroItems: HeroItem[] = heroSource.slice(0, 5).map((s) => ({
    id: Number(s.id) || s.id,
    title: s.title,
    overview: s.overview,
    backdropPath: s.backdrop,
    posterPath: s.poster,
    mediaType: "tv",
    rating: s.rating,
    releaseYear: s.year,
    genres: s.genres,
  }));

  const isGridView = view === "grid" || Boolean(category) || Boolean(genre);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {!isGridView && heroItems.length > 0 && <ChillerHero items={heroItems} />}

        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {category
                ? `TV Series — ${category.replace(/_/g, " ").toUpperCase()}`
                : genre
                ? `TV Series — ${genre.toUpperCase()}`
                : "Television & Series"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Binge addictive seasons, limited series, and global television phenomena.
            </p>
          </div>
        </div>

        {isGridView ? (
          <InfiniteMediaGrid
            query={{
              mediaType: "tv",
              category: category || "popular",
              genre,
            }}
          />
        ) : (
          <>
            <InfiniteMediaRail
              title="Trending TV Series"
              query={{ category: "trending_tv", mediaType: "tv", timeWindow: "week" }}
              initialItems={trendingItems}
              seeAllHref="/series?category=trending"
              layout="backdrop"
              badge="#TRENDING"
            />

            <InfiniteMediaRail
              title="Popular Series"
              query={{ category: "popular", mediaType: "tv" }}
              seeAllHref="/series?category=popular"
              layout="poster"
            />

            <InfiniteMediaRail
              title="On The Air & Returning"
              query={{ category: "on_the_air", mediaType: "tv" }}
              seeAllHref="/series?category=on_the_air"
              layout="poster"
              badge="#ONAIR"
            />

            <InfiniteMediaRail
              title="Top Rated & Critically Acclaimed"
              query={{ category: "top_rated", mediaType: "tv" }}
              seeAllHref="/series?category=top_rated"
              layout="poster"
              badge="#TOPRATED"
            />

            <InfiniteMediaRail
              title="Airing Today"
              query={{ category: "airing_today", mediaType: "tv" }}
              seeAllHref="/series?category=airing_today"
              layout="poster"
              badge="#TODAY"
            />

            {/* Genre Rails */}
            <InfiniteMediaRail
              title="Gripping Drama Series"
              query={{ genre: "drama", mediaType: "tv" }}
              seeAllHref="/genre/drama?type=tv"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Sci-Fi & Fantasy Series"
              query={{ genre: "scifi", mediaType: "tv" }}
              seeAllHref="/genre/scifi?type=tv"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Crime & Investigation"
              query={{ genre: "crime", mediaType: "tv" }}
              seeAllHref="/genre/crime?type=tv"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Comedy Series & Sitcoms"
              query={{ genre: "comedy", mediaType: "tv" }}
              seeAllHref="/genre/comedy?type=tv"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Action & Adventure"
              query={{ genre: "action", mediaType: "tv" }}
              seeAllHref="/genre/action?type=tv"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Mystery & Thriller"
              query={{ genre: "thriller", mediaType: "tv" }}
              seeAllHref="/genre/thriller?type=tv"
              layout="poster"
            />

            {/* Cultural highlights */}
            <InfiniteMediaRail
              title="K-Drama Sensations"
              query={{ category: "kdrama", language: "ko", country: "KR", mediaType: "tv" }}
              seeAllHref="/series?category=kdrama"
              layout="poster"
              badge="#KDRAMA"
            />

            <InfiniteMediaRail
              title="C-Drama Historical & Romance"
              query={{ category: "cdrama", language: "zh", country: "CN", mediaType: "tv" }}
              seeAllHref="/series?category=cdrama"
              layout="poster"
              badge="#CDRAMA"
            />

            <InfiniteMediaRail
              title="Animated Series & Cartoons"
              query={{ category: "kids", mediaType: "tv" }}
              seeAllHref="/series?category=kids"
              layout="poster"
              badge="#KIDS"
            />

            <InfiniteMediaRail
              title="Documentary Series"
              query={{ category: "documentary", mediaType: "tv" }}
              seeAllHref="/genre/documentary?type=tv"
              layout="poster"
              badge="#DOCS"
            />
          </>
        )}
      </main>
    </div>
  );
}
