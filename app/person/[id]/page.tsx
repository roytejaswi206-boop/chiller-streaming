import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaCard } from "@/components/video/MediaCard";
import { getPersonDetails } from "@/lib/tmdb/client";

export const dynamic = "force-dynamic";

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;
  const personId = parseInt(id, 10);

  if (isNaN(personId) || personId <= 0) {
    notFound();
  }

  try {
    const person = await getPersonDetails(personId);
    if (!person || !person.name) notFound();

    const castCredits = person.combined_credits?.cast || [];
    const movieCredits = castCredits
      .filter((c) => c.media_type === "movie" && Boolean(c.poster_path))
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

    const tvCredits = castCredits
      .filter((c) => c.media_type === "tv" && Boolean(c.poster_path))
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

    const profileUrl = person.profile_path
      ? `https://image.tmdb.org/t/p/h632${person.profile_path}`
      : "/placeholder-avatar.png";

    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
        <Sidebar />

        <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-10">
          {/* Person Header Card */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0F172A] p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row gap-8 items-start">
            <div className="relative w-40 sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-[#1E293B]">
              <Image
                src={profileUrl}
                alt={person.name}
                fill
                sizes="(max-width: 640px) 160px, 208px"
                className="object-cover"
                unoptimized={profileUrl.startsWith("http")}
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#FF3B6B]/20 border border-[#FF3B6B]/30 text-[#FF3B6B] text-[10px] font-black uppercase tracking-wider">
                  {person.known_for_department || "Acting"}
                </span>

                {person.birthday && (
                  <span className="text-xs font-semibold text-zinc-400">
                    Born: {person.birthday} {person.place_of_birth ? `in ${person.place_of_birth}` : ""}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {person.name}
              </h1>

              {person.biography ? (
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-4xl line-clamp-6">
                  {person.biography}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 italic">No biography available.</p>
              )}
            </div>
          </div>

          {/* Filmography: Movies */}
          {movieCredits.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Featured Movies ({movieCredits.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {movieCredits.slice(0, 18).map((m) => (
                  <MediaCard
                    key={`movie-${m.id}`}
                    id={m.id}
                    title={m.title || "Untitled"}
                    posterPath={m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "/placeholder-poster.png"}
                    backdropPath={m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : undefined}
                    mediaType="movie"
                    rating={m.vote_average || 0}
                    releaseYear={(m.release_date || "").split("-")[0]}
                    layout="poster"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Filmography: Series & Television */}
          {tvCredits.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Television & Series ({tvCredits.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {tvCredits.slice(0, 18).map((t) => (
                  <MediaCard
                    key={`tv-${t.id}`}
                    id={t.id}
                    title={t.name || "Untitled Series"}
                    posterPath={t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : "/placeholder-poster.png"}
                    backdropPath={t.backdrop_path ? `https://image.tmdb.org/t/p/w780${t.backdrop_path}` : undefined}
                    mediaType="tv"
                    rating={t.vote_average || 0}
                    releaseYear={(t.first_air_date || "").split("-")[0]}
                    layout="poster"
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  } catch {
    notFound();
  }
}
