import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaDetailView } from "@/components/video/MediaDetailView";
import { getTVDetails, getSeasonDetails } from "@/lib/tmdb/client";
import { getCanonicalUrl } from "@/lib/config/site";
import { JsonLd, buildTVSeriesSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>;
}

function parseAnimeId(id: string): number {
  let animeId = parseInt(id, 10);
  if (isNaN(animeId) && id.includes("-")) {
    const parts = id.split("-");
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last) && last > 0) animeId = last;
  }
  return animeId;
}

export async function generateMetadata({ params }: AnimeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const animeId = parseAnimeId(id);

  if (isNaN(animeId) || animeId <= 0) {
    return {
      title: "Anime Not Found • CHILLER",
      robots: { index: false, follow: true },
    };
  }

  const canonicalUrl = getCanonicalUrl(`/anime/${animeId}`);

  // Attempt AniList fetch first
  try {
    const { resolveAnimeAnilistId } = await import("@/lib/media/identity/id-mapper");
    const canonicalAnilistId = await resolveAnimeAnilistId({
      anilistId: animeId,
      tmdbId: animeId,
    });
    const effectiveAnilistId = canonicalAnilistId || animeId;

    const { AniListContentProvider } = await import("@/lib/content/providers/anilist");
    const anilistProvider = new AniListContentProvider();
    const anime = await anilistProvider.getAnime(effectiveAnilistId).catch(() => null);

    if (anime) {
      const title = anime.title || "Anime";
      const releaseYear = anime.year ? String(anime.year) : (anime.releaseDate || "").split("-")[0];
      const pageTitle = releaseYear ? `${title} (${releaseYear})` : title;
      const description = anime.overview
        ? anime.overview.length > 155
          ? `${anime.overview.slice(0, 155)}...`
          : anime.overview
        : `Watch ${title} subbed and dubbed in HD on CHILLER with seamless episode streaming.`;
      const imageUrl = anime.backdropUrl || anime.posterUrl || "/branding/og-image.jpg";

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
          images: [{ url: imageUrl, width: 1200, height: 675, alt: title }],
        },
        twitter: {
          card: "summary_large_image",
          title: `CHILLER | ${title}`,
          description,
          images: [imageUrl],
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
    }
  } catch {
    // Fallback to TMDB
  }

  try {
    const tvData = await getTVDetails(animeId).catch(() => null);
    if (tvData) {
      const title = tvData.name || tvData.title || "Anime";
      const releaseYear = (tvData.first_air_date || "").split("-")[0];
      const pageTitle = releaseYear ? `${title} (${releaseYear})` : title;
      const description = tvData.overview
        ? tvData.overview.length > 155
          ? `${tvData.overview.slice(0, 155)}...`
          : tvData.overview
        : `Watch ${title} anime on CHILLER with crystal-clear high quality streaming.`;
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
          images: [{ url: backdropUrl, width: 1200, height: 675, alt: title }],
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
    }
  } catch {
    // Graceful fallback
  }

  return {
    title: "Anime Details • CHILLER",
    robots: { index: true, follow: true },
  };
}

export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const { id } = await params;
  const animeId = parseAnimeId(id);

  if (isNaN(animeId) || animeId <= 0) {
    notFound();
  }

  try {
    const { resolveAnimeAnilistId } = await import("@/lib/media/identity/id-mapper");
    const canonicalAnilistId = await resolveAnimeAnilistId({
      anilistId: animeId,
      tmdbId: animeId,
    });
    const effectiveAnilistId = canonicalAnilistId || animeId;

    // Attempt AniList fetch first if available
    try {
      const { AniListContentProvider } = await import("@/lib/content/providers/anilist");
      const anilistProvider = new AniListContentProvider();
      const anime = await anilistProvider.getAnime(effectiveAnilistId);

      if (anime) {
        let recommendations: any[] = [];
        try {
          const tmdbTV = await getTVDetails(animeId).catch(() => null);
          if (tmdbTV?.recommendations?.results?.length) {
            recommendations = tmdbTV.recommendations.results.slice(0, 10);
          } else if (tmdbTV?.similar?.results?.length) {
            recommendations = tmdbTV.similar.results.slice(0, 10);
          } else {
            const trending = await anilistProvider.getTrending(1, 10).catch(() => ({ items: [] }));
            recommendations = (trending.items || [])
              .filter((item) => String(item.externalIds.anilistId || item.id) !== String(animeId))
              .slice(0, 10)
              .map((item) => ({
                id: item.externalIds.anilistId || parseInt(item.id.replace(/\D/g, ""), 10) || item.id,
                title: item.title,
                name: item.title,
                poster_path: item.posterUrl,
                backdrop_path: item.backdropUrl,
                vote_average: item.rating,
                first_air_date: item.releaseDate || item.year,
              }));
          }
        } catch {
          // Graceful fallback for recommendations
        }

        const animeSchema = buildTVSeriesSchema({
          id: animeId,
          name: anime.title,
          overview: anime.overview,
          posterPath: anime.posterUrl,
          backdropPath: anime.backdropUrl,
          firstAirDate: anime.releaseDate || (anime.year ? `${anime.year}-01-01` : undefined),
          numberOfSeasons: 1,
          numberOfEpisodes: (anime as any).episodes || 12,
          genres: anime.genres || [],
          rating: anime.rating || undefined,
          voteCount: undefined,
          country: "Japan",
          isAnime: true,
        });

        const breadcrumbsSchema = buildBreadcrumbSchema([
          { name: "Home", url: getCanonicalUrl("/") },
          { name: "Anime", url: getCanonicalUrl("/anime") },
          { name: anime.title, url: getCanonicalUrl(`/anime/${animeId}`) },
        ]);

        return (
          <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
            <JsonLd schema={[animeSchema, breadcrumbsSchema]} />
            <Sidebar />
            <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
              <MediaDetailView
                id={effectiveAnilistId}
                title={anime.title}
                originalTitle={(anime as any).nativeTitle}
                overview={anime.overview || "No description provided."}
                posterPath={anime.posterUrl || null}
                backdropPath={anime.backdropUrl || null}
                mediaType="anime"
                releaseYear={anime.year ? String(anime.year) : (anime.releaseDate || "").split("-")[0]}
                status={(anime as any).status}
                genres={anime.genres || []}
                rating={anime.rating || 0}
                totalSeasons={1}
                seasons={[{ season_number: 1, name: "Season 1", episode_count: (anime as any).episodes || 12 }]}
                cast={[]}
                recommendations={recommendations}
              />
            </main>
          </div>
        );
      }
    } catch {
      // Fallback to TMDB TV details
    }

    // Fallback: TMDB TV representation of the anime
    const [tv, season1] = await Promise.allSettled([
      getTVDetails(animeId),
      getSeasonDetails(animeId, 1),
    ]);

    const tvData = tv.status === "fulfilled" ? tv.value : null;
    if (!tvData) notFound();

    const title = tvData.name || tvData.title || "Untitled Anime";
    const season1Data = season1.status === "fulfilled" ? season1.value : undefined;

    const filteredSeasons = (tvData.seasons || [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count,
        poster_path: s.poster_path,
      }));

    const animeSchema = buildTVSeriesSchema({
      id: animeId,
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
      country: "Japan",
      isAnime: true,
    });

    const breadcrumbsSchema = buildBreadcrumbSchema([
      { name: "Home", url: getCanonicalUrl("/") },
      { name: "Anime", url: getCanonicalUrl("/anime") },
      { name: title, url: getCanonicalUrl(`/anime/${animeId}`) },
    ]);

    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
        <JsonLd schema={[animeSchema, breadcrumbsSchema]} />
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
          <MediaDetailView
            id={animeId}
            title={title}
            originalTitle={tvData.original_name}
            overview={tvData.overview || "No description provided."}
            posterPath={tvData.poster_path}
            backdropPath={tvData.backdrop_path}
            mediaType="anime"
            releaseYear={(tvData.first_air_date || "").split("-")[0]}
            status={(tvData as any).status}
            genres={tvData.genres?.map((g) => g.name) || []}
            rating={Number(tvData.vote_average.toFixed(1))}
            totalSeasons={tvData.number_of_seasons || filteredSeasons.length}
            seasons={filteredSeasons}
            initialSeasonDetails={season1Data}
            cast={tvData.credits?.cast?.slice(0, 10)}
            recommendations={(tvData.recommendations?.results || tvData.similar?.results || []).slice(0, 10)}
          />
        </main>
      </div>
    );
  } catch {
    notFound();
  }
}
