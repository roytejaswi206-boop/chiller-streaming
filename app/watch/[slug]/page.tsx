import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { WatchPlayer } from "@/components/player/WatchPlayer";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { EpisodePicker } from "@/components/player/EpisodePicker";
import { WatchlistButton } from "@/components/player/WatchlistButton";
import { HistoryTracker } from "@/components/player/HistoryTracker";
import { MediaRail } from "@/components/video/MediaRail";
import { IconStar } from "@/components/icons";
import { resolveContent } from "@/lib/playback/resolver";
import { getGenreNames } from "@/lib/tmdb/genres";

export const dynamic = "force-dynamic";

interface WatchPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ s?: string; e?: string; season?: string; episode?: string }>;
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;

  const season = parseInt(sParams.s || sParams.season || "1", 10);
  const episode = parseInt(sParams.e || sParams.episode || "1", 10);

  const content = await resolveContent(slug, { season, episode });

  if (!content) {
    notFound();
  }

  // Format recommendations rail items if present
  const recItems = (content.recommendations || []).map((r: any) => ({
    id: r.id,
    title: r.title || r.name || "Untitled",
    posterPath: r.poster_path,
    backdropPath: r.backdrop_path,
    mediaType: content.mediaType as any,
    rating: r.vote_average,
    releaseYear: (r.release_date || r.first_air_date || "").split("-")[0],
    genres: getGenreNames(r.genre_ids),
  }));

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        {/* Silent History Logger */}
        <HistoryTracker
          tmdbId={content.tmdbId}
          videoId={content.videoId}
          mediaType={content.mediaType}
          title={content.title}
          posterUrl={content.posterUrl}
          season={content.season}
          episode={content.episode}
        />

        <div className="max-w-6xl mx-auto">
          {/* 1. Player Section */}
          <div className="mb-6">
            {content.sourceType === "EXTERNAL" && content.sources && content.sources.length > 0 ? (
              <WatchPlayer
                sources={content.sources}
                title={content.title}
                posterUrl={content.backdropUrl || content.posterUrl}
                mediaType={content.mediaType as any}
                tmdbId={content.tmdbId}
                anilistId={content.anilistId}
                season={content.season}
                episode={content.episode}
                slug={slug}
              />
            ) : content.sourceType === "OWNED" && content.streamUrl ? (
              <VideoPlayer
                streamUrl={content.streamUrl}
                backupStreamUrls={content.backupStreamUrls}
                title={content.title}
                posterUrl={content.backdropUrl || content.posterUrl}
                subtitles={content.subtitles}
                qualities={content.qualities}
                autoPlay={false}
              />
            ) : (
              <div className="aspect-video w-full rounded-2xl bg-[#0F172A] border border-white/10 flex flex-col items-center justify-center p-8 text-center shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mb-4">
                  ⚠️
                </div>
                <h2 className="text-lg font-bold text-white mb-2">
                  Playback Currently Unavailable
                </h2>
                <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
                  {content.errorMessage ||
                    "This title cannot be streamed at the moment. Please verify API configuration in the admin dashboard."}
                </p>
                <div className="flex items-center gap-3">
                  <Link
                    href="/"
                    className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-bold transition"
                  >
                    Return Home
                  </Link>
                  <Link
                    href={`/watch/${slug}?s=${season}&e=${episode}&retry=1`}
                    className="px-5 py-2.5 rounded-full bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25"
                  >
                    Retry Connection
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* 2. Title & Metadata Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  content.mediaType === "tv"
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                    : "bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30"
                }`}
              >
                {content.mediaType.toUpperCase()}
              </span>

              {content.genres.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-semibold text-zinc-300 border border-white/5"
                >
                  {g}
                </span>
              ))}

              {content.releaseYear && (
                <span className="text-xs font-semibold text-zinc-400">
                  {content.releaseYear}
                </span>
              )}

              {content.runtime ? (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs font-semibold text-zinc-400">
                    {Math.floor(content.runtime / 60)}h {content.runtime % 60}m
                  </span>
                </>
              ) : content.totalSeasons ? (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs font-semibold text-zinc-400">
                    {content.totalSeasons} {content.totalSeasons === 1 ? "Season" : "Seasons"}
                  </span>
                </>
              ) : null}

              {content.rating > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold ml-1">
                  <IconStar className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{content.rating.toFixed(1)}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-white/[0.08]">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {content.title}
                </h1>
                {content.originalTitle && content.originalTitle !== content.title && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Original: {content.originalTitle}
                  </p>
                )}
              </div>

              {/* Action Buttons: My List */}
              <div className="flex items-center gap-3">
                <WatchlistButton
                  tmdbId={content.tmdbId}
                  videoId={content.videoId}
                  mediaType={content.mediaType}
                  title={content.title}
                  posterUrl={content.posterUrl}
                  backdropUrl={content.backdropUrl}
                  rating={content.rating}
                  releaseYear={content.releaseYear}
                />
              </div>
            </div>
          </div>

          {/* 3. TV / Anime Series Episode Picker */}
          {content.mediaType === "tv" && content.seasons && content.seasons.length > 0 && (
            <EpisodePicker
              slug={slug}
              currentSeason={season}
              currentEpisode={episode}
              seasons={content.seasons}
              currentSeasonDetails={content.currentSeasonDetails}
            />
          )}

          {/* 4. Overview & About Section */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0F172A] p-6 mb-8">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-2">
              Story Overview
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-4xl">
              {content.overview}
            </p>

            {/* Cast Row */}
            {content.cast && content.cast.length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/[0.06]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Starring Cast
                </h4>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {content.cast.map((actor) => {
                    const profileUrl = actor.profile_path
                      ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                      : "/placeholder-avatar.png";

                    return (
                      <div
                        key={actor.id}
                        className="flex flex-col items-center text-center shrink-0 w-20"
                      >
                        <div className="relative w-14 h-14 rounded-full overflow-hidden mb-1.5 bg-black/40 border border-white/10">
                          <Image
                            src={profileUrl}
                            alt={actor.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                            unoptimized={profileUrl.startsWith("http")}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-white truncate w-full">
                          {actor.name}
                        </span>
                        <span className="text-[9px] text-zinc-400 truncate w-full">
                          {actor.character}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. Recommended / Related Content Rail */}
          {recItems.length > 0 && (
            <div className="mt-8">
              <MediaRail
                title="More Stories Like This"
                items={recItems}
                layout="poster"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
