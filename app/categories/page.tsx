import Link from "next/link";
import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { CategoryCard } from "@/components/video/CategoryCard";
import { prisma } from "@/lib/prisma";
import { getCanonicalUrl } from "@/lib/config/site";
import { GENRE_SLUG_MAP } from "@/lib/content/discovery";
import { JsonLd, buildCollectionSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories & Genres | Movies, Series & Anime | CHILLER",
  description: "Browse movies, TV series, and anime by category and genre on CHILLER. Action, comedy, horror, romance, sci-fi, drama, documentaries, and more in HD.",
  alternates: {
    canonical: getCanonicalUrl("/categories"),
  },
  openGraph: {
    title: "Categories & Genres | Movies, Series & Anime | CHILLER",
    description: "Browse movies, TV series, and anime by category and genre on CHILLER.",
    url: getCanonicalUrl("/categories"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "Categories on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Categories & Genres | Movies, Series & Anime | CHILLER",
    description: "Browse movies, TV series, and anime by category and genre on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
};

const GENRE_EMOJIS: Record<string, string> = {
  action: "💥",
  adventure: "🗺️",
  animation: "✨",
  comedy: "😂",
  crime: "🕵️",
  documentary: "📜",
  drama: "🎭",
  family: "👨‍👩‍👧‍👦",
  fantasy: "🧙",
  history: "🏛️",
  horror: "👻",
  music: "🎵",
  mystery: "🔍",
  romance: "💖",
  scifi: "🚀",
  thriller: "⚡",
  war: "⚔️",
  western: "🤠",
};

export default async function CategoriesPage() {
  const categories = await prisma.category
    .findMany({
      orderBy: { order: "asc" },
    })
    .catch(() => []);

  const collectionSchema = buildCollectionSchema(
    "Categories & Genres",
    "Browse movies, TV series, and anime by category and genre on CHILLER.",
    "/categories"
  );
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: getCanonicalUrl("/") },
    { name: "Categories", url: getCanonicalUrl("/categories") },
  ]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090c]">
      <JsonLd schema={[collectionSchema, breadcrumbSchema]} />
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-10">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30 text-[10px] font-black uppercase tracking-wider">
              Discovery Directory
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Explore Categories & Genres
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
            Navigate through our curated universe of cinematic genres, regional storytelling, and specialty collections across movies, series, and anime.
          </p>
        </div>

        {/* Global Film & TV Genres */}
        <section aria-labelledby="genres-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="genres-heading" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>🍿</span>
              <span>All Genres</span>
            </h2>
            <span className="text-xs text-zinc-500">{Object.keys(GENRE_SLUG_MAP).length} genres available</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {Object.entries(GENRE_SLUG_MAP).map(([slug, meta]) => {
              const emoji = GENRE_EMOJIS[slug] || "🎬";
              return (
                <Link
                  key={slug}
                  href={`/genre/${slug}`}
                  className="group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-[#FF3B6B]/40 p-4 transition-all duration-200 flex flex-col justify-between h-28 tap-instant"
                >
                  <div className="text-2xl">{emoji}</div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#FF3B6B] transition-colors">
                      {meta.name}
                    </h3>
                    <span className="text-[11px] text-zinc-500 font-medium">Explore titles →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Custom Curated Collections if any exist in DB */}
        {categories.length > 0 && (
          <section aria-labelledby="custom-heading" className="space-y-4 pt-4 border-t border-white/[0.08]">
            <h2 id="custom-heading" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>⭐</span>
              <span>Curated Collections</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  slug={cat.slug}
                  thumbnail={cat.thumbnail}
                  icon={cat.icon}
                  videoCount={cat.videoCount}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
