import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaDetailView } from "@/components/video/MediaDetailView";
import { getTVDetails, getSeasonDetails } from "@/lib/tmdb/client";
import { getCanonicalUrl } from "@/lib/config/site";
import { JsonLd, buildTVSeriesSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";

interface SeriesDetailPageProps {
  params: Promise<{ id: string }>;
}

function parseSeriesId(id: string): number {
  let tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId) && id.includes("-")) {
    const parts = id.split("-");
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last) && last > 0) tmdbId = last;
  }
  return tmdbId;
}

export async function generateMetadata({ params }: SeriesDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const tmdbId = parseSeriesId(id);

  if (isNaN(tmdbId) || tmdbId <= 0) {
    return {
      title: "Series Not Found • CHILLER",
      robots: { index: false, follow: true },
    };
  }

  try {
    const tvData = await getTVDetails(tmdbId);
    if (!tvData) {
      return {
        title: "Series Not Found • CHILLER",
        robots: { index: false, follow: true },
      };
    }

    const title = tvData.name || tvData.title || "Series";
    const releaseYear = (tvData.first_air_date || "").split("-")[0];
    const pageTitle = releaseYear ? `${title} (${releaseYear})` : title;
    const description = tvData.overview
      ? tvData.overview.length > 155
        ? `${tvData.overview.slice(0, 155)}...`
        : tvData.overview
      : `Watch ${title} on CHILLER with all seasons, episodes, and seamless HD streaming.`;

    const canonicalUrl = getCanonicalUrl(`/tv/${tmdbId}`);
    const backdropUrl = tvData.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${tvData.backdrop_path}`
      : tvData.poster_path
      ? `https://image.tmdb.org/t/p/w780${tvData.poster_path}`
      : "/branding/og-image.jpg";

    return {
      title: `${pageTitle} — Watch Beyond`,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        type: "video.tv_show",
        locale: "en_US",
        url: canonicalUrl,
        title: `CHILLER | ${title}`,
        description,
        siteName: "CHILLER",
        images: [
          {
            url: backdropUrl,
            width: 1200,
            height: 675,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `CHILLER | ${title}`,
        description,
        images: [backdropUrl],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
    };
  } catch {
    return {
      title: "Series Details • CHILLER",
      robots: { index: true, follow: true },
    };
  }
}

export default async function SeriesDetailPage({ params }: SeriesDetailPageProps) {
  const { id } = await params;
  const tmdbId = parseSeriesId(id);

  if (isNaN(tmdbId) || tmdbId <= 0) {
    notFound();
  }

  try {
    const [tv, season1] = await Promise.allSettled([
      getTVDetails(tmdbId),
      getSeasonDetails(tmdbId, 1),
    ]);

    const tvData = tv.status === "fulfilled" ? tv.value : null;
    if (!tvData) notFound();

    const isAnime =
      (tvData.original_language === "ja" || tvData.origin_country?.includes("JP")) &&
      tvData.genres?.some((g: any) => g.id === 16 || g.name === "Animation");

    if (isAnime) {
      redirect(`/anime/${tmdbId}`);
    }

    const title = tvData.name || tvData.title || "Untitled Series";
    const season1Data = season1.status === "fulfilled" ? season1.value : undefined;

    const filteredSeasons = (tvData.seasons || [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count,
        poster_path: s.poster_path,
      }));

    const trailerKey =
      (tvData as any).videos?.results?.find((v: any) => v.site === "YouTube" && v.type === "Trailer")?.key ||
      (tvData as any).videos?.results?.find((v: any) => v.site === "YouTube")?.key ||
      null;

    const country =
      (tvData as any).production_countries?.[0]?.name ||
      (tvData as any).origin_country?.[0] ||
      undefined;

    const similarTitles = (tvData.similar?.results || []).slice(0, 15);
    const recommendations = (tvData.recommendations?.results || []).slice(0, 15);

    const tvSeriesSchema = buildTVSeriesSchema({
      id: tmdbId,
      name: title,
      overview: tvData.overview,
      posterPath: tvData.poster_path,
      backdropPath: tvData.backdrop_path,
      firstAirDate: tvData.first_air_date,
      numberOfSeasons: tvData.number_of_seasons || filteredSeasons.length,
      genres: tvData.genres?.map((g) => g.name) || [],
      rating: tvData.vote_average,
      voteCount: tvData.vote_count,
      cast: tvData.credits?.cast?.slice(0, 10).map((c) => ({ name: c.name })),
      country,
    });

    const breadcrumbsSchema = buildBreadcrumbSchema([
      { name: "Home", url: getCanonicalUrl("/") },
      { name: "Series", url: getCanonicalUrl("/series") },
      { name: title, url: getCanonicalUrl(`/tv/${tmdbId}`) },
    ]);

    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
        <JsonLd schema={[tvSeriesSchema, breadcrumbsSchema]} />
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
          <MediaDetailView
            id={tmdbId}
            title={title}
            originalTitle={tvData.original_name}
            overview={tvData.overview || "No description provided."}
            posterPath={tvData.poster_path}
            backdropPath={tvData.backdrop_path}
            mediaType="tv"
            releaseYear={(tvData.first_air_date || "").split("-")[0]}
            status={(tvData as any).status}
            genres={tvData.genres?.map((g) => g.name) || []}
            rating={Number(tvData.vote_average.toFixed(1))}
            country={country}
            trailerKey={trailerKey}
            totalSeasons={tvData.number_of_seasons || filteredSeasons.length}
            seasons={filteredSeasons}
            initialSeasonDetails={season1Data}
            cast={tvData.credits?.cast?.slice(0, 12)}
            similarTitles={similarTitles}
            recommendations={recommendations.length > 0 ? recommendations : similarTitles}
          />
        </main>
      </div>
    );
  } catch {
    notFound();
  }
}
