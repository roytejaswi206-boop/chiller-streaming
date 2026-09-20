import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaDetailView } from "@/components/video/MediaDetailView";
import { getMovieDetails } from "@/lib/tmdb/client";

export const dynamic = "force-dynamic";

interface MovieDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MovieDetailPage({ params }: MovieDetailPageProps) {
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
    const movie = await getMovieDetails(tmdbId);
    if (!movie) notFound();

    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
          <MediaDetailView
            id={tmdbId}
            title={movie.title || movie.name || "Untitled Movie"}
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
            cast={movie.credits?.cast?.slice(0, 10)}
            recommendations={(movie.recommendations?.results || movie.similar?.results || []).slice(0, 10)}
          />
        </main>
      </div>
    );
  } catch {
    notFound();
  }
}
