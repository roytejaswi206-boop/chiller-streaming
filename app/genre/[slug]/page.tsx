import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { InfiniteMediaGrid } from "@/components/video/InfiniteMediaGrid";
import { GENRE_SLUG_MAP } from "@/lib/content/discovery";
import { getCanonicalUrl } from "@/lib/config/site";
import { JsonLd, buildCollectionSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";
import { AdSlot } from "@/components/ads/AdSlot";

export const dynamic = "force-dynamic";

interface GenrePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string; sort?: string }>;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();
  const genreMeta = GENRE_SLUG_MAP[normalizedSlug];
  const genreTitle = genreMeta?.name || normalizedSlug.charAt(0).toUpperCase() + normalizedSlug.slice(1);

  const title = `${genreTitle} Movies, Series & Anime`;
  const description = `Explore top-rated, popular, and trending ${genreTitle.toLowerCase()} movies, television shows, and anime on CHILLER. HD streaming, multiple languages, and continuous discovery.`;
  const canonicalUrl = getCanonicalUrl(`/genre/${normalizedSlug}`);

  return {
    title: `${title} — Watch Beyond`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonicalUrl,
      title: `CHILLER | ${title}`,
      description,
      siteName: "CHILLER",
      images: [
        {
          url: "/branding/og-image.jpg",
          width: 1200,
          height: 630,
          alt: `${genreTitle} on CHILLER`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `CHILLER | ${title}`,
      description,
      images: ["/branding/og-image.jpg"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  const { type = "all", sort = "popularity.desc" } = await searchParams;

  const normalizedSlug = slug.toLowerCase();
  const genreMeta = GENRE_SLUG_MAP[normalizedSlug];
  const genreTitle = genreMeta?.name || normalizedSlug.charAt(0).toUpperCase() + normalizedSlug.slice(1);

  const mediaType = (type === "movie" || type === "tv" || type === "anime" ? type : undefined) as any;

  const collectionSchema = buildCollectionSchema(
    `${genreTitle} Streaming & Discovery`,
    `Discover ${genreTitle.toLowerCase()} movies, series, and anime on CHILLER.`,
    `/genre/${normalizedSlug}`
  );

  const breadcrumbsSchema = buildBreadcrumbSchema([
    { name: "Home", url: getCanonicalUrl("/") },
    { name: "Categories", url: getCanonicalUrl("/categories") },
    { name: genreTitle, url: getCanonicalUrl(`/genre/${normalizedSlug}`) },
  ]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <JsonLd schema={[collectionSchema, breadcrumbsSchema]} />
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {/* Genre Banner */}
        <section aria-labelledby="genre-heading" className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-[#181824] via-[#12121A] to-[#09090C] p-6 lg:p-10 mb-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#FF3B6B]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF3B6B]">
              Genre Exploration
            </span>
            <h1 id="genre-heading" className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 mb-2">
              {genreTitle}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
              Browse thousands of {genreTitle.toLowerCase()} movies, series, and anime. Continuous discovery powered by the Chiller Engine.
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
        </section>

        {/* Centralized Ad Slot: Between Content Groups */}
        <AdSlot placement="genre_mid" />

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

        {/* Centralized Ad Slot: Before Footer Native Banner */}
        <AdSlot placement="genre_bottom" format="native" />
      </main>
    </div>
  );
}
