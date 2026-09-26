import React from "react";
import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChillerHero, HeroItem } from "@/components/video/ChillerHero";
import { InfiniteMediaRail } from "@/components/video/InfiniteMediaRail";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { discoverContent } from "@/lib/content/discovery";
import { AdSlot } from "@/components/ads/AdSlot";
import { getCanonicalUrl } from "@/lib/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Watch Anime Online Free — Subbed & Dubbed HD Episodes",
  description: "Stream trending, popular, and classic anime on CHILLER. Fast HD buffering, Japanese audio with English subtitles, English dubs, and seamless AniList discovery.",
  alternates: {
    canonical: getCanonicalUrl("/anime"),
  },
  openGraph: {
    title: "CHILLER | Watch Anime Online Free",
    description: "Stream trending, popular, and classic anime on CHILLER. Fast HD buffering, Japanese audio with English subtitles, and English dubs.",
    url: getCanonicalUrl("/anime"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "Watch Anime on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHILLER | Watch Anime Online Free",
    description: "Stream trending, popular, and classic anime on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
};

interface AnimePageProps {
  searchParams: Promise<{ category?: string; genre?: string; format?: string; view?: string }>;
}

export default async function AnimePage({ searchParams }: AnimePageProps) {
  const { category, genre, format, view } = await searchParams;

  // Pre-fetch top trending anime for the hero from AniList
  const trendingRes = await discoverContent({
    mediaType: "anime",
    category: "trending",
    page: 1,
  });

  const trendingItems = trendingRes.items || [];

  const heroCandidates = trendingItems.filter(
    (item) => item.backdrop && !item.backdrop.includes("placeholder") && item.overview && item.overview.length > 20
  );
  const heroSource = heroCandidates.length >= 3 ? heroCandidates : trendingItems;
  const heroItems: HeroItem[] = heroSource.slice(0, 5).map((a) => ({
    id: a.anilistId || (typeof a.id === "string" ? parseInt(a.id.replace(/\D/g, ""), 10) || a.id : a.id),
    title: a.title,
    overview: a.overview,
    backdropPath: a.backdrop,
    posterPath: a.poster,
    mediaType: "anime",
    rating: a.rating,
    releaseYear: a.year,
    genres: a.genres,
  }));

  const isGridView = view === "grid" || Boolean(category) || Boolean(genre) || Boolean(format);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {!isGridView && heroItems.length > 0 && <ChillerHero items={heroItems} />}

        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#8A5CFF] uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-[#8A5CFF] animate-pulse" />
              AniList Intelligence Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {category
                ? `Anime — ${category.replace(/_/g, " ").toUpperCase()}`
                : genre
                ? `Anime — ${genre.toUpperCase()}`
                : format
                ? `Anime — ${format.toUpperCase()}`
                : "Anime Universe"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Explore thousands of anime series, movies, OVAs, and seasonal releases directly from AniList.
            </p>
          </div>
        </div>

        {isGridView ? (
          <InfiniteMediaGrid
            query={{
              mediaType: "anime",
              category: category || "popular",
              genre,
              format: format as any,
            }}
          />
        ) : (
          <>
            <InfiniteMediaRail
              title="Trending Anime"
              query={{ mediaType: "anime", category: "trending" }}
              initialItems={trendingItems}
              seeAllHref="/anime?category=trending"
              layout="backdrop"
              badge="AniList Top"
            />

            <InfiniteMediaRail
              title="Currently Airing This Season"
              query={{ mediaType: "anime", category: "airing" }}
              seeAllHref="/anime?category=airing"
              layout="poster"
              badge="#AIRING"
            />

            <InfiniteMediaRail
              title="Popular All Time"
              query={{ mediaType: "anime", category: "popular" }}
              seeAllHref="/anime?category=popular"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Critically Acclaimed & Top Rated"
              query={{ mediaType: "anime", category: "top_rated" }}
              seeAllHref="/anime?category=top_rated"
              layout="poster"
              badge="#TOPRATED"
            />

            <InfiniteMediaRail
              title="Anime Feature Films"
              query={{ mediaType: "anime", format: "MOVIE" }}
              seeAllHref="/anime?format=MOVIE"
              layout="poster"
              badge="#MOVIE"
            />

            {/* Centralized Ad Slot: Browse Content Banner */}
            <AdSlot placement="browse_content" />

            <InfiniteMediaRail
              title="Action & Shonen"
              query={{ mediaType: "anime", genre: "Action" }}
              seeAllHref="/anime?genre=Action"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Fantasy & Isekai"
              query={{ mediaType: "anime", genre: "Fantasy" }}
              seeAllHref="/anime?genre=Fantasy"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Sci-Fi & Cyberpunk"
              query={{ mediaType: "anime", genre: "Sci-Fi" }}
              seeAllHref="/anime?genre=Sci-Fi"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Romance & Slice of Life"
              query={{ mediaType: "anime", genre: "Romance" }}
              seeAllHref="/anime?genre=Romance"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Mystery & Psychological"
              query={{ mediaType: "anime", genre: "Mystery" }}
              seeAllHref="/anime?genre=Mystery"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Comedy & Satire"
              query={{ mediaType: "anime", genre: "Comedy" }}
              seeAllHref="/anime?genre=Comedy"
              layout="poster"
            />

            <InfiniteMediaRail
              title="OVAs & Specials"
              query={{ mediaType: "anime", format: "OVA" }}
              seeAllHref="/anime?format=OVA"
              layout="poster"
              badge="#OVA"
            />
          </>
        )}
      </main>
    </div>
  );
}
