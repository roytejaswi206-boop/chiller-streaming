"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { IconPlay, IconStar } from "@/components/icons";
import { SeasonSelector, SeasonInfo } from "@/components/player/SeasonSelector";
import { EpisodeList, EpisodeItem } from "@/components/player/EpisodeList";
import { WatchlistButton } from "@/components/player/WatchlistButton";
import { MediaRail } from "@/components/video/MediaRail";
import { TmdbSeasonDetail } from "@/lib/tmdb/client";

interface MediaDetailViewProps {
  id: number;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  mediaType: "movie" | "tv" | "anime";
  releaseYear: string;
  status?: string;
  genres: string[];
  rating: number;
  runtime?: number;
  totalSeasons?: number;
  seasons?: SeasonInfo[];
  initialSeasonDetails?: TmdbSeasonDetail;
  cast?: { id: number; name: string; character: string; profile_path: string | null }[];
  recommendations?: any[];
}

export function MediaDetailView({
  id,
  title,
  originalTitle,
  overview,
  posterPath,
  backdropPath,
  mediaType,
  releaseYear,
  status,
  genres = [],
  rating = 0,
  runtime,
  totalSeasons = 1,
  seasons = [],
  initialSeasonDetails,
  cast = [],
  recommendations = [],
}: MediaDetailViewProps) {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>(
    initialSeasonDetails?.episodes || []
  );

  const watchUrl =
    mediaType === "movie"
      ? `/watch/movie/${id}`
      : `/watch/${mediaType === "anime" ? "anime" : "tv"}/${id}?s=${selectedSeason}&e=1`;

  const posterUrl = posterPath
    ? `https://image.tmdb.org/t/p/w780${posterPath}`
    : "/placeholder-poster.png";

  const backdropUrl = backdropPath
    ? `https://image.tmdb.org/t/p/original${backdropPath}`
    : "";

  const handleSelectSeason = useCallback(
    async (seasonNum: number) => {
      setSelectedSeason(seasonNum);
      try {
        const res = await fetch(`/api/content/tv/${id}`);
        if (res.ok) {
          // If we have API or if season matches initial
          if (initialSeasonDetails && initialSeasonDetails.season_number === seasonNum) {
            setEpisodes(initialSeasonDetails.episodes);
          }
        }
      } catch {
        // Fallback
      }
    },
    [id, initialSeasonDetails]
  );

  const [activeTab, setActiveTab] = useState<"overview" | "episodes" | "cast" | "similar">("overview");

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* ── 1. Hero Section ── */}
      <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0F172A] shadow-2xl min-h-[480px] flex flex-col justify-end p-6 sm:p-10">
        {/* Backdrop Image with gradient overlays */}
        {backdropUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={backdropUrl}
              alt={title}
              fill
              priority
              sizes="100vw"
              className="object-cover object-top opacity-35"
              unoptimized={backdropUrl.startsWith("http")}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090C] via-[#09090C]/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09090C] via-[#09090C]/60 to-transparent" />
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end gap-6 sm:gap-8">
          {/* Poster */}
          <div className="relative w-36 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/15 shrink-0 bg-[#1E293B]">
            <Image
              src={posterUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 144px, 192px"
              className="object-cover"
              unoptimized={posterUrl.startsWith("http")}
            />
          </div>

          {/* Details & Action Buttons */}
          <div className="flex-1 space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  mediaType === "anime"
                    ? "bg-[#8A5CFF]/20 text-[#8A5CFF] border border-[#8A5CFF]/30"
                    : mediaType === "tv"
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                    : "bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30"
                }`}
              >
                {mediaType.toUpperCase()}
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10 text-[10px] font-extrabold text-[#F8FAFC]">
                4K UHD
              </span>

              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-zinc-300">
                Dolby Atmos
              </span>

              {status && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 text-[10px] font-bold border border-white/5">
                  {status}
                </span>
              )}

              {releaseYear && <span className="text-xs font-semibold text-zinc-300">{releaseYear}</span>}

              {runtime ? (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs font-semibold text-zinc-300">
                    {Math.floor(runtime / 60)}h {runtime % 60}m
                  </span>
                </>
              ) : totalSeasons ? (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs font-semibold text-zinc-300">
                    {totalSeasons} {totalSeasons === 1 ? "Season" : "Seasons"}
                  </span>
                </>
              ) : null}

              {rating > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold">
                  <IconStar className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{rating.toFixed(1)}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              {title}
            </h1>

            {originalTitle && originalTitle !== title && (
              <p className="text-xs sm:text-sm text-zinc-400">Original: {originalTitle}</p>
            )}

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-semibold text-zinc-300 border border-white/5"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed line-clamp-3 sm:line-clamp-4 pt-1">
              {overview}
            </p>

            {/* Action Buttons: Watch Now & Add to List */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={watchUrl}
                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF3B6B] to-[#FF5A85] hover:brightness-110 text-white text-sm font-black transition-all duration-200 shadow-xl shadow-[#FF3B6B]/30 hover:scale-105 active:scale-95"
              >
                <IconPlay className="w-4 h-4 fill-white" />
                <span>Watch Now</span>
              </Link>

              <WatchlistButton
                tmdbId={id}
                mediaType={mediaType as any}
                title={title}
                posterUrl={posterUrl}
                backdropUrl={backdropUrl}
                rating={rating}
                releaseYear={releaseYear}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Navigation Tabs (Image 1 & 2 design) ── */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "overview"
              ? "bg-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Overview
        </button>

        {(mediaType === "tv" || mediaType === "anime") && seasons.length > 0 && (
          <button
            onClick={() => setActiveTab("episodes")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "episodes"
                ? "bg-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Episodes
          </button>
        )}

        {cast.length > 0 && (
          <button
            onClick={() => setActiveTab("cast")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "cast"
                ? "bg-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Cast & Crew
          </button>
        )}

        {recommendations.length > 0 && (
          <button
            onClick={() => setActiveTab("similar")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "similar"
                ? "bg-[#FF3B6B] text-white shadow-lg shadow-[#FF3B6B]/25"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Similar Titles
          </button>
        )}
      </div>

      {/* ── 3. Tab Contents ── */}
      {(activeTab === "overview" || activeTab === "episodes") && (mediaType === "tv" || mediaType === "anime") && seasons.length > 0 && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              Seasons
            </h2>
            <SeasonSelector
              seasons={seasons}
              selectedSeason={selectedSeason}
              onSelectSeason={handleSelectSeason}
            />
          </div>

          <EpisodeList
            episodes={episodes}
            currentEpisode={0}
            onSelectEpisode={(epNum) => {
              window.location.href = `/watch/${mediaType === "anime" ? "anime" : "tv"}/${id}?s=${selectedSeason}&e=${epNum}`;
            }}
            tmdbId={id}
            seasonNumber={selectedSeason}
          />
        </div>
      )}

      {/* Cast Grid (Clickable to /person/[id]) */}
      {(activeTab === "overview" || activeTab === "cast") && cast.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0F172A] p-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-4">
            Starring Cast
          </h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {cast.map((actor) => {
              const profileUrl = actor.profile_path
                ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                : "/placeholder-avatar.png";

              return (
                <Link
                  key={actor.id}
                  href={`/person/${actor.id}`}
                  className="flex flex-col items-center text-center shrink-0 w-20 group cursor-pointer"
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden mb-1.5 bg-black/40 border border-white/10 group-hover:border-[#FF3B6B] transition duration-200">
                    <Image
                      src={profileUrl}
                      alt={actor.name}
                      fill
                      sizes="56px"
                      className="object-cover group-hover:scale-105 transition duration-200"
                      unoptimized={profileUrl.startsWith("http")}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-white group-hover:text-[#FF3B6B] transition truncate w-full">
                    {actor.name}
                  </span>
                  <span className="text-[9px] text-zinc-400 truncate w-full">{actor.character}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. Recommended Content Rail ── */}
      {recommendations.length > 0 && (
        <div>
          <MediaRail
            title="You Might Also Like"
            items={recommendations.map((r: any) => ({
              id: r.id,
              title: r.title || r.name || "Untitled",
              posterPath: r.poster_path,
              backdropPath: r.backdrop_path,
              mediaType: mediaType as any,
              rating: r.vote_average,
              releaseYear: (r.release_date || r.first_air_date || "").split("-")[0],
              genres: [],
            }))}
            layout="poster"
          />
        </div>
      )}
    </div>
  );
}
