import React from "react";
import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChillerHero, HeroItem } from "@/components/video/ChillerHero";
import { InfiniteMediaRail } from "@/components/video/InfiniteMediaRail";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { RegionalDiscoveryRail } from "@/components/discovery/RegionalDiscoveryRail";
import { LanguageDiscoveryRail } from "@/components/discovery/LanguageDiscoveryRail";
import { discoverContent } from "@/lib/content/discovery";
import { AdSlot } from "@/components/ads/AdSlot";
import { getCanonicalUrl } from "@/lib/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stream Movies Online — Action, Sci-Fi, Drama & Blockbusters",
  description: "Explore top-rated, trending, and newly released movies on CHILLER. Watch in high definition with fast streaming and subtitles.",
  alternates: {
    canonical: getCanonicalUrl("/movies"),
  },
  openGraph: {
    title: "CHILLER | Stream Movies Online",
    description: "Explore top-rated, trending, and newly released movies on CHILLER. Watch in HD with fast streaming and subtitles.",
    url: getCanonicalUrl("/movies"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "Stream Movies on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHILLER | Stream Movies Online",
    description: "Explore top-rated, trending, and newly released movies on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
};

interface MoviesPageProps {
  searchParams: Promise<{ category?: string; genre?: string; view?: string }>;
}

export default async function MoviesPage({ searchParams }: MoviesPageProps) {
  const { category, genre, view } = await searchParams;

  // Pre-fetch top trending movie for the Hero
  const trendingRes = await discoverContent({
    category: "trending_movies",
    mediaType: "movie",
    timeWindow: "week",
    page: 1,
  });

  const trendingItems = trendingRes.items || [];

  const heroCandidates = trendingItems.filter(
    (item) => item.backdrop && !item.backdrop.includes("placeholder") && item.overview && item.overview.length > 20
  );
  const heroSource = heroCandidates.length >= 3 ? heroCandidates : trendingItems;
  const heroItems: HeroItem[] = heroSource.slice(0, 5).map((m) => ({
    id: Number(m.id) || m.id,
    title: m.title,
    overview: m.overview,
    backdropPath: m.backdrop,
    posterPath: m.poster,
    mediaType: "movie",
    rating: m.rating,
    releaseYear: m.year,
    genres: m.genres,
  }));

  const isGridView = view === "grid" || Boolean(category) || Boolean(genre);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {/* Hero */}
        {!isGridView && heroItems.length > 0 && <ChillerHero items={heroItems} />}

        {/* View Toggle / Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {category
                ? `Movies — ${category.replace(/_/g, " ").toUpperCase()}`
                : genre
                ? `Movies — ${genre.toUpperCase()}`
                : "Movie Universe"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Stream cinematic masterpieces, blockbusters, and indie gems in HD.
            </p>
          </div>
        </div>

        {isGridView ? (
          /* Filtered Infinite Grid */
          <InfiniteMediaGrid
            query={{
              mediaType: "movie",
              category: category || "popular",
              genre,
            }}
          />
        ) : (
          /* Multi-Rail Movie Discovery */
          <>
            <InfiniteMediaRail
              title="Trending Movies"
              query={{ category: "trending_movies", mediaType: "movie", timeWindow: "week" }}
              initialItems={trendingItems}
              seeAllHref="/movies?category=trending"
              layout="backdrop"
              badge="#TRENDING"
            />

            <InfiniteMediaRail
              title="Popular Movies"
              query={{ category: "popular", mediaType: "movie" }}
              seeAllHref="/movies?category=popular"
              layout="poster"
            />

            {/* Regional & Country Movies Discovery */}
            <RegionalDiscoveryRail />

            {/* Language Discovery */}
            <LanguageDiscoveryRail />

            <InfiniteMediaRail
              title="Now Playing in Theaters"
              query={{ category: "now_playing", mediaType: "movie" }}
              seeAllHref="/movies?category=now_playing"
              layout="poster"
              badge="#THEATERS"
            />

            <InfiniteMediaRail
              title="Upcoming Movies"
              query={{ category: "upcoming", mediaType: "movie" }}
              seeAllHref="/movies?category=upcoming"
              layout="poster"
              badge="#SOON"
            />

            <InfiniteMediaRail
              title="Top Rated Classics & Hits"
              query={{ category: "top_rated", mediaType: "movie" }}
              seeAllHref="/movies?category=top_rated"
              layout="poster"
              badge="#TOPRATED"
            />

            {/* Centralized Ad Slot: Browse Content Banner */}
            <AdSlot placement="browse_content" />

            {/* Genre Rails */}
            <InfiniteMediaRail
              title="Action & Adrenaline"
              query={{ genre: "action", mediaType: "movie" }}
              seeAllHref="/genre/action?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Sci-Fi & Cyberpunk"
              query={{ genre: "scifi", mediaType: "movie" }}
              seeAllHref="/genre/scifi?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Comedy & Satire"
              query={{ genre: "comedy", mediaType: "movie" }}
              seeAllHref="/genre/comedy?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Horror & Slasher"
              query={{ genre: "horror", mediaType: "movie" }}
              seeAllHref="/genre/horror?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Thriller & Suspense"
              query={{ genre: "thriller", mediaType: "movie" }}
              seeAllHref="/genre/thriller?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Romance & Heartfelt"
              query={{ genre: "romance", mediaType: "movie" }}
              seeAllHref="/genre/romance?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Crime & Noir"
              query={{ genre: "crime", mediaType: "movie" }}
              seeAllHref="/genre/crime?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Drama & Powerful Stories"
              query={{ genre: "drama", mediaType: "movie" }}
              seeAllHref="/genre/drama?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Adventure & Quests"
              query={{ genre: "adventure", mediaType: "movie" }}
              seeAllHref="/genre/adventure?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Fantasy & Magic"
              query={{ genre: "fantasy", mediaType: "movie" }}
              seeAllHref="/genre/fantasy?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Animation & Family"
              query={{ genre: "animation", mediaType: "movie" }}
              seeAllHref="/genre/animation?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="War & Military"
              query={{ genre: "war", mediaType: "movie" }}
              seeAllHref="/genre/war?type=movie"
              layout="poster"
            />

            <InfiniteMediaRail
              title="Western & Frontier"
              query={{ genre: "western", mediaType: "movie" }}
              seeAllHref="/genre/western?type=movie"
              layout="poster"
            />

            {/* International Cinema */}
            <InfiniteMediaRail
              title="Hindi Cinema (Bollywood)"
              query={{ language: "hi", mediaType: "movie" }}
              seeAllHref="/movies?language=hi"
              layout="poster"
              badge="#BOLLYWOOD"
            />

            <InfiniteMediaRail
              title="Korean Cinema"
              query={{ language: "ko", mediaType: "movie" }}
              seeAllHref="/movies?language=ko"
              layout="poster"
              badge="#KOREA"
            />

            <InfiniteMediaRail
              title="Japanese Cinema"
              query={{ language: "ja", mediaType: "movie" }}
              seeAllHref="/movies?language=ja"
              layout="poster"
              badge="#JAPAN"
            />

            <InfiniteMediaRail
              title="French Cinema"
              query={{ language: "fr", mediaType: "movie" }}
              seeAllHref="/movies?language=fr"
              layout="poster"
              badge="#FRANCE"
            />

            <InfiniteMediaRail
              title="Spanish Cinema"
              query={{ language: "es", mediaType: "movie" }}
              seeAllHref="/movies?language=es"
              layout="poster"
              badge="#SPAIN"
            />
          </>
        )}
      </main>
    </div>
  );
}
