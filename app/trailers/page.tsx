import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { discoverContent } from "@/lib/content/discovery";
import { getTrailers } from "@/lib/tmdb/client";

export const dynamic = "force-dynamic";

interface TrailerCardProps {
  id: number | string;
  title: string;
  mediaType: "movie" | "tv" | "anime";
  backdrop: string;
  year?: string;
}

async function TrailerItem({ item }: { item: TrailerCardProps }) {
  let trailerKey: string | null = null;
  try {
    const trailers = await getTrailers(item.mediaType === "movie" ? "movie" : "tv", item.id);
    const official = trailers.find((t) => t.site === "YouTube" && (t.type === "Trailer" || t.type === "Teaser"));
    trailerKey = official ? official.key : trailers[0]?.key || null;
  } catch {
    trailerKey = null;
  }

  if (!trailerKey) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0F172A] shadow-xl flex flex-col">
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${trailerKey}?rel=0&modestbranding=1`}
          title={`${item.title} Trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
      <div className="p-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white line-clamp-1">{item.title}</h3>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            {item.mediaType.toUpperCase()} {item.year ? `• ${item.year}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function TrailersPage() {
  const [moviesRes, seriesRes] = await Promise.allSettled([
    discoverContent({ category: "now_playing", mediaType: "movie", page: 1 }),
    discoverContent({ category: "on_the_air", mediaType: "tv", page: 1 }),
  ]);

  const movies = moviesRes.status === "fulfilled" ? moviesRes.value.items.slice(0, 6) : [];
  const series = seriesRes.status === "fulfilled" ? seriesRes.value.items.slice(0, 6) : [];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-10">
        <div className="border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30 text-[10px] font-black uppercase tracking-wider">
              Trailers & Teasers
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Latest Official Trailers
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Watch high-definition movie previews, television season teasers, and upcoming sneak peeks.
          </p>
        </div>

        {/* Latest Movie Trailers */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-white tracking-wide">
            🎬 New & Upcoming Movie Trailers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.map((m) => (
              <TrailerItem
                key={`movie-trailer-${m.id}`}
                item={{
                  id: m.id,
                  title: m.title,
                  mediaType: "movie",
                  backdrop: m.backdrop,
                  year: m.year,
                }}
              />
            ))}
          </div>
        </div>

        {/* Series Trailers */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-white tracking-wide">
            📺 Television & Series Trailers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {series.map((s) => (
              <TrailerItem
                key={`series-trailer-${s.id}`}
                item={{
                  id: s.id,
                  title: s.title,
                  mediaType: "tv",
                  backdrop: s.backdrop,
                  year: s.year,
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
