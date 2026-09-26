import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaDetailView } from "@/components/video/MediaDetailView";
import { getMovieDetails } from "@/lib/tmdb/client";
import { getCanonicalUrl } from "@/lib/config/site";
import { JsonLd, buildMovieSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";

interface MovieDetailPageProps {
  params: Promise<{ id: string }>;
}

function parseMovieId(id: string): number {
  let tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId) && id.includes("-")) {
    const parts = id.split("-");
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last) && last > 0) tmdbId = last;
  }
  return tmdbId;
}

export async function generateMetadata({ params }: MovieDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const tmdbId = parseMovieId(id);

  if (isNaN(tmdbId) || tmdbId <= 0) {
    return {
      title: "Movie Not Found • CHILLER",
      robots: { index: false, follow: true },
    };
  }

  try {
    const movie = await getMovieDetails(tmdbId);
    if (!movie) {
      return {
        title: "Movie Not Found • CHILLER",
        robots: { index: false, follow: true },
      };
    }

    const title = movie.title || movie.name || "Movie";
    const releaseYear = (movie.release_date || "").split("-")[0];
    const pageTitle = releaseYear ? `${title} (${releaseYear})` : title;
    const description = movie.overview
      ? movie.overview.length > 155
        ? `${movie.overview.slice(0, 155)}...`
        : movie.overview
      : `Watch ${title} on CHILLER with crystal-clear high quality streaming and seamless discovery.`;

    const canonicalUrl = getCanonicalUrl(`/movie/${tmdbId}`);
    const backdropUrl = movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
      : movie.poster_path
      ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
      : "/branding/og-image.jpg";

    return {
      title: `${pageTitle} — Watch Beyond`,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        type: "video.movie",
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
      title: "Movie Details • CHILLER",
      robots: { index: true, follow: true },
    };
  }
}

export default async function MovieDetailPage({ params }: MovieDetailPageProps) {
  const { id } = await params;
  const tmdbId = parseMovieId(id);

  if (isNaN(tmdbId) || tmdbId <= 0) {
    notFound();
  }

  try {
    const movie = await getMovieDetails(tmdbId);
    if (!movie) notFound();

    const title = movie.title || movie.name || "Untitled Movie";
    const trailerKey =
      (movie as any).videos?.results?.find((v: any) => v.site === "YouTube" && v.type === "Trailer")?.key ||
      (movie as any).videos?.results?.find((v: any) => v.site === "YouTube")?.key ||
      null;

    const country =
      (movie as any).production_countries?.[0]?.name ||
      (movie as any).origin_country?.[0] ||
      undefined;

    const similarTitles = (movie.similar?.results || []).slice(0, 15);
    const recommendations = (movie.recommendations?.results || []).slice(0, 15);

    const movieSchema = buildMovieSchema({
      id: tmdbId,
      title,
      overview: movie.overview,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      releaseDate: movie.release_date,
      runtime: movie.runtime,
      genres: movie.genres?.map((g) => g.name) || [],
      rating: movie.vote_average,
      voteCount: movie.vote_count,
      cast: movie.credits?.cast?.slice(0, 10).map((c) => ({ name: c.name })),
      country,
    });

    const breadcrumbsSchema = buildBreadcrumbSchema([
      { name: "Home", url: getCanonicalUrl("/") },
      { name: "Movies", url: getCanonicalUrl("/movies") },
      { name: title, url: getCanonicalUrl(`/movie/${tmdbId}`) },
    ]);

    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
        <JsonLd schema={[movieSchema, breadcrumbsSchema]} />
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
          <MediaDetailView
            id={tmdbId}
            title={title}
            originalTitle={movie.original_title}
            overview={movie.overview || "No description provided."}
            posterPath={movie.poster_path}
            backdropPath={movie.backdrop_path}
            mediaType="movie"
            releaseYear={(movie.release_date || "").split("-")[0]}
            status={(movie as any).status}
            genres={movie.genres?.map((g) => g.name) || []}
            rating={Number(movie.vote_average.toFixed(1))}
            runtime={movie.runtime}
            country={country}
            trailerKey={trailerKey}
            cast={movie.credits?.cast?.slice(0, 12)}
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
