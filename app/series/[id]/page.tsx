import { notFound, redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaDetailView } from "@/components/video/MediaDetailView";
import { getTVDetails, getSeasonDetails } from "@/lib/tmdb/client";

export const dynamic = "force-dynamic";

interface SeriesDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SeriesDetailPage({ params }: SeriesDetailPageProps) {
  const { id } = await params;
  let tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId) && id.includes("-")) {
    const parts = id.split("-");
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last) && last > 0) tmdbId = last;
  }

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

    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
          <MediaDetailView
            id={tmdbId}
            title={tvData.name || tvData.title || "Untitled Series"}
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
