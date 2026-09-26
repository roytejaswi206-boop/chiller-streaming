import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChillerHero, HeroItem } from "@/components/video/ChillerHero";
import { InfiniteMediaRail } from "@/components/video/InfiniteMediaRail";
import { ContinueWatchingRail } from "@/components/video/ContinueWatchingRail";
import { RegionalDiscoveryRail } from "@/components/discovery/RegionalDiscoveryRail";
import { LanguageDiscoveryRail } from "@/components/discovery/LanguageDiscoveryRail";
import { ChillerIntro } from "@/components/intro/ChillerIntro";
import { discoverContent } from "@/lib/content/discovery";
import { AdSlot } from "@/components/ads/AdSlot";
import { getCanonicalUrl } from "@/lib/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CHILLER — Watch Beyond | Free Movies, TV Series & Anime",
  description: "A premium cinematic streaming and discovery platform. Watch thousands of HD movies, TV shows, and subbed/dubbed anime with zero subscription fees.",
  alternates: {
    canonical: getCanonicalUrl("/"),
  },
  openGraph: {
    title: "CHILLER — Watch Beyond",
    description: "A premium cinematic streaming and discovery platform. Watch thousands of HD movies, TV shows, and subbed/dubbed anime.",
    url: getCanonicalUrl("/"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "CHILLER — Watch Beyond" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHILLER — Watch Beyond",
    description: "A premium cinematic streaming and discovery platform. Watch thousands of HD movies, TV shows, and subbed/dubbed anime.",
    images: ["/branding/og-image.jpg"],
  },
};

export default async function HomePage() {
  // Pre-fetch top rails for instant initial server render
  const [trendingAllRes, trendingMoviesRes, trendingSeriesRes] = await Promise.allSettled([
    discoverContent({ category: "trending", timeWindow: "week", page: 1 }),
    discoverContent({ category: "trending_movies", mediaType: "movie", timeWindow: "week", page: 1 }),
    discoverContent({ category: "trending_tv", mediaType: "tv", timeWindow: "week", page: 1 }),
  ]);

  const trendingItems = trendingAllRes.status === "fulfilled" ? trendingAllRes.value.items : [];
  const trendingMovies = trendingMoviesRes.status === "fulfilled" ? trendingMoviesRes.value.items : [];
  const trendingSeries = trendingSeriesRes.status === "fulfilled" ? trendingSeriesRes.value.items : [];

  const isConfigured = trendingItems.length > 0 || trendingMovies.length > 0;

  // Format Hero Slides from top cinematic trending items with valid high-res backdrops
  const heroCandidates = trendingItems.filter(
    (item) => item.backdrop && !item.backdrop.includes("placeholder") && item.overview && item.overview.length > 20
  );
  const heroSource = heroCandidates.length >= 3 ? heroCandidates : trendingItems;
  const heroItems: HeroItem[] = heroSource.slice(0, 5).map((item) => ({
    id: Number(item.id) || item.id,
    title: item.title,
    overview: item.overview,
    backdropPath: item.backdrop,
    posterPath: item.poster,
    mediaType: item.type === "anime" ? "anime" : item.type === "tv" ? "tv" : "movie",
    rating: item.rating,
    releaseYear: item.year,
    genres: item.genres,
  }));

  return (
    <>
      {/* 0. Official First-Launch Brand Intro Experience */}
      <ChillerIntro />

      <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
        {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Streaming & Discovery Canvas */}
      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {!isConfigured ? (
          <div className="rounded-3xl border border-white/10 bg-[#0F172A] p-8 lg:p-12 text-center max-w-2xl mx-auto my-12 shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <img
                src="/branding/chiller-icon-emblem.webp"
                alt="CHILLER"
                className="w-full h-full object-contain drop-shadow-[0_4px_20px_rgba(255,59,107,0.5)]"
              />
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mb-2">
              Welcome to CHILLER
            </h1>
            <p className="text-xs font-black text-[#FF3B6B] uppercase tracking-[0.25em] mb-4">
              WATCH BEYOND
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed mb-8">
              Chiller is ready to stream. Configure your <strong>TMDB</strong> API credentials in the settings dashboard to begin discovering thousands of titles.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/admin/settings"
                className="px-6 py-3 rounded-full bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/30"
              >
                Configure API Keys in Settings
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Cinematic Hero Section */}
            {heroItems.length > 0 && <ChillerHero items={heroItems} />}

            {/* Centralized Ad Slot: Top Banner */}
            <AdSlot placement="home_top" />

            {/* 2. Trending Now (Backdrop layout with Top 10 ranking) */}
            <InfiniteMediaRail
              title="Trending Now"
              query={{ category: "trending", timeWindow: "week" }}
              initialItems={trendingItems}
              seeAllHref="/trending"
              layout="backdrop"
              ranking={true}
              badge="Top 10 Global"
            />

            {/* 3. Continue Watching (Client state or authenticated DB) */}
            <ContinueWatchingRail />

            {/* 3.5. Regional & Country Discovery (NetMirror-Inspired Native Experience) */}
            <RegionalDiscoveryRail />

            {/* 4. Trending Movies Rail */}
            <InfiniteMediaRail
              title="Trending Movies"
              query={{ category: "trending_movies", mediaType: "movie", timeWindow: "week" }}
              initialItems={trendingMovies}
              seeAllHref="/movies?category=trending"
              layout="poster"
            />

            {/* 5. Trending Series Rail */}
            <InfiniteMediaRail
              title="Trending Series"
              query={{ category: "trending_tv", mediaType: "tv", timeWindow: "week" }}
              initialItems={trendingSeries}
              seeAllHref="/series?category=trending"
              layout="poster"
            />

            {/* 6. Trending Anime (AniList Primary) */}
            <InfiniteMediaRail
              title="Trending Anime"
              query={{ mediaType: "anime", category: "trending" }}
              seeAllHref="/anime?category=trending"
              layout="poster"
              badge="AniList"
            />

            {/* 6.5. Browse by Language (NetMirror-Inspired Native Experience) */}
            <LanguageDiscoveryRail />

            {/* Centralized Ad Slot: Mid Content Banner */}
            <AdSlot placement="home_mid" />

            {/* 7. Popular Movies */}
            <InfiniteMediaRail
              title="Popular Movies"
              query={{ category: "popular", mediaType: "movie" }}
              seeAllHref="/movies"
              layout="poster"
            />

            {/* 8. Popular Series */}
            <InfiniteMediaRail
              title="Popular Series"
              query={{ category: "popular", mediaType: "tv" }}
              seeAllHref="/series"
              layout="poster"
            />

            {/* 9. Popular Anime (AniList Primary) */}
            <InfiniteMediaRail
              title="Popular Anime"
              query={{ mediaType: "anime", category: "popular" }}
              seeAllHref="/anime"
              layout="poster"
              badge="AniList"
            />

            {/* 10. New Releases (Theatrical / Now Playing) */}
            <InfiniteMediaRail
              title="New Releases"
              query={{ category: "now_playing", mediaType: "movie" }}
              seeAllHref="/movies?category=now_playing"
              layout="poster"
              badge="#NEWRELEASE"
            />

            {/* 11. Recently Added (On The Air TV) */}
            <InfiniteMediaRail
              title="Recently Added & On Air"
              query={{ category: "on_the_air", mediaType: "tv" }}
              seeAllHref="/series?category=on_the_air"
              layout="poster"
            />

            {/* 12. Top Rated */}
            <InfiniteMediaRail
              title="Top Rated All Time"
              query={{ category: "top_rated", mediaType: "movie" }}
              seeAllHref="/movies?category=top_rated"
              layout="poster"
              badge="#TOPRATED"
            />

            {/* 13. Action Blockbusters */}
            <InfiniteMediaRail
              title="Action Blockbusters"
              query={{ genre: "action", mediaType: "movie" }}
              seeAllHref="/genre/action"
              layout="poster"
            />

            {/* 14. Comedy & Laughs */}
            <InfiniteMediaRail
              title="Comedy & Laughs"
              query={{ genre: "comedy", mediaType: "movie" }}
              seeAllHref="/genre/comedy"
              layout="poster"
            />

            {/* 15. Sci-Fi & Cyberpunk */}
            <InfiniteMediaRail
              title="Sci-Fi & Cyberpunk"
              query={{ genre: "scifi", mediaType: "movie" }}
              seeAllHref="/genre/scifi"
              layout="poster"
            />

            {/* 16. Thriller & Suspense */}
            <InfiniteMediaRail
              title="Thriller & Suspense"
              query={{ genre: "thriller", mediaType: "movie" }}
              seeAllHref="/genre/thriller"
              layout="poster"
            />

            {/* 17. Horror & Supernatural */}
            <InfiniteMediaRail
              title="Horror & Supernatural"
              query={{ genre: "horror", mediaType: "movie" }}
              seeAllHref="/genre/horror"
              layout="poster"
            />

            {/* Centralized Ad Slot: Lower Discovery Native Banner */}
            <AdSlot placement="home_discovery" format="native" />

            {/* 18. Romance & Love Stories */}
            <InfiniteMediaRail
              title="Romance & Love Stories"
              query={{ genre: "romance", mediaType: "movie" }}
              seeAllHref="/genre/romance"
              layout="poster"
            />

            {/* 19. Drama & Masterpieces */}
            <InfiniteMediaRail
              title="Drama & Masterpieces"
              query={{ genre: "drama", mediaType: "movie" }}
              seeAllHref="/genre/drama"
              layout="poster"
            />

            {/* 20. K-Drama Sensations */}
            <InfiniteMediaRail
              title="K-Drama Sensations"
              query={{ category: "kdrama", language: "ko", country: "KR", mediaType: "tv" }}
              seeAllHref="/series?category=kdrama"
              layout="poster"
              badge="#KDRAMA"
            />

            {/* 21. C-Drama Historical & Romance */}
            <InfiniteMediaRail
              title="C-Drama Epics"
              query={{ category: "cdrama", language: "zh", country: "CN", mediaType: "tv" }}
              seeAllHref="/series?category=cdrama"
              layout="poster"
              badge="#CDRAMA"
            />

            {/* 22. Kids & Cartoons */}
            <InfiniteMediaRail
              title="Kids & Cartoons"
              query={{ category: "kids", mediaType: "tv" }}
              seeAllHref="/series?category=kids"
              layout="poster"
              badge="#KIDS"
            />

            {/* 23. Documentaries & Real Stories */}
            <InfiniteMediaRail
              title="Documentaries"
              query={{ category: "documentary", mediaType: "movie" }}
              seeAllHref="/genre/documentary"
              layout="poster"
              badge="#DOCS"
            />

            {/* 24. Upcoming & Coming Soon */}
            <InfiniteMediaRail
              title="Upcoming & Coming Soon"
              query={{ category: "upcoming", mediaType: "movie" }}
              seeAllHref="/movies?category=upcoming"
              layout="poster"
            />

            {/* 25. Recommended For You */}
            <InfiniteMediaRail
              title="Recommended For You"
              query={{ category: "popular", mediaType: "movie", sort: "popularity.desc" }}
              seeAllHref="/movies"
              layout="poster"
              badge="For You"
            />

            {/* Centralized Ad Slot: Before Footer Native Banner */}
            <AdSlot placement="home_bottom" format="native" />
          </>
        )}
      </main>
      </div>
    </>
  );
}
