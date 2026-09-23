import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaDetailView } from "@/components/video/MediaDetailView";
import { getTVDetails, getSeasonDetails } from "@/lib/tmdb/client";

export const dynamic = "force-dynamic";

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const { id } = await params;
  let animeId = parseInt(id, 10);
  if (isNaN(animeId) && id.includes("-")) {
    const parts = id.split("-");
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last) && last > 0) animeId = last;
  }

  if (isNaN(animeId) || animeId <= 0) {
    notFound();
  }

  try {
    // Attempt AniList fetch first if available
    try {
      const { AniListContentProvider } = await import("@/lib/content/providers/anilist");
      const anilistProvider = new AniListContentProvider();
      const anime = await anilistProvider.getAnime(animeId);

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

        return (
          <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
            <Sidebar />
            <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
              <MediaDetailView
                id={animeId}
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

    const season1Data = season1.status === "fulfilled" ? season1.value : undefined;

    const filteredSeasons = (tvData.seasons || [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count,
        poster_path: s.poster_path,
      }));

    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
          <MediaDetailView
            id={animeId}
            title={tvData.name || tvData.title || "Untitled Anime"}
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
