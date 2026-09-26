"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { IconPlay, IconStar } from "@/components/icons";
import { SeasonSelector, SeasonInfo } from "@/components/player/SeasonSelector";
import { EpisodeList, EpisodeItem } from "@/components/player/EpisodeList";
import { WatchlistButton } from "@/components/player/WatchlistButton";
import { MediaRail } from "@/components/video/MediaRail";
import { TrailerPreview } from "@/components/video/TrailerPreview";
import { TmdbSeasonDetail } from "@/lib/tmdb/client";
import { formatDuration } from "@/lib/utils";
import { resolveResumeSourceOfTruth } from "@/lib/playback/resume-service";
import { AdSlot } from "@/components/ads/AdSlot";

interface MediaDetailViewProps {
  id: number;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  mediaType: "movie" | "tv" | "anime";
  releaseYear: string;
  releaseDate?: string;
  status?: string;
  genres: string[];
  rating: number;
  runtime?: number;
  country?: string;
  trailerKey?: string | null;
  totalSeasons?: number;
  seasons?: SeasonInfo[];
  initialSeasonDetails?: TmdbSeasonDetail;
  cast?: { id: number; name: string; character: string; profile_path: string | null }[];
  recommendations?: any[];
  similarTitles?: any[];
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
  releaseDate,
  status,
  genres = [],
  rating = 0,
  runtime,
  country,
  trailerKey,
  totalSeasons = 1,
  seasons = [],
  initialSeasonDetails,
  cast = [],
  recommendations = [],
  similarTitles = [],
}: MediaDetailViewProps) {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>(
    initialSeasonDetails?.episodes || []
  );

  const { data: session } = useSession();
  const [resumeInfo, setResumeInfo] = useState<{
    position: number;
    season: number;
    episode: number;
    isCompleted: boolean;
  } | null>(null);

  useEffect(() => {
    async function loadResume() {
      // 1. Check authenticated database progress
      if (session?.user) {
        try {
          const res = await fetch("/api/user/history");
          if (res.ok) {
            const data = await res.json();
            if (data.items) {
              const resObj = resolveResumeSourceOfTruth({
                mediaType,
                tmdbId: id,
                authDbItems: data.items,
              });
              if (resObj.position > 0) {
                const m = data.items.find((i: any) => Number(i.tmdbId) === id);
                setResumeInfo({
                  position: resObj.position,
                  season: m?.seasonNumber || 1,
                  episode: m?.episodeNumber || 1,
                  isCompleted: resObj.isCompleted,
                });
                return;
              }
            }
          }
        } catch {
          // Fallback
        }
      }

      // 2. Check guest local storage
      const resObj = resolveResumeSourceOfTruth({
        mediaType,
        tmdbId: id,
      });
      if (resObj.position > 0) {
        let s = 1;
        let e = 1;
        try {
          const raw = localStorage.getItem("chiller_history");
          if (raw) {
            const list = JSON.parse(raw);
            const found = list.find((item: any) => Number(item.tmdbId || item.id) === id);
            if (found) {
              s = found.seasonNumber || 1;
              e = found.episodeNumber || 1;
            }
          }
        } catch {}
        setResumeInfo({
          position: resObj.position,
          season: s,
          episode: e,
          isCompleted: resObj.isCompleted,
        });
      } else if (resObj.isCompleted) {
        setResumeInfo({ position: 0, season: 1, episode: 1, isCompleted: true });
      }
    }

    loadResume();
  }, [id, mediaType, session]);

  const watchUrl =
    mediaType === "movie"
      ? `/watch/movie/${id}`
      : `/watch/${mediaType === "anime" ? "anime" : "tv"}/${id}?s=${selectedSeason}&e=1`;

  const posterUrl = posterPath
    ? `https://image.tmdb.org/t/p/w500${posterPath}`
    : "/placeholder-poster.png";

  const backdropUrl = backdropPath
    ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
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
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* ── 1. Hero Section ── */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0F172A] shadow-2xl min-h-[360px] sm:min-h-[480px] flex flex-col justify-end p-4 sm:p-10">
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

              {country && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 text-[10px] font-bold border border-white/5">
                  {country}
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
                {genres.map((g) => {
                  const genreSlug = g
                    .toLowerCase()
                    .replace(/&/g, "and")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");
                  return (
                    <Link
                      key={g}
                      href={`/genre/${genreSlug}`}
                      className="px-2.5 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] hover:text-white transition text-[11px] font-semibold text-zinc-300 border border-white/5 cursor-pointer"
                    >
                      {g}
                    </Link>
                  );
                })}
              </div>
            )}

            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed line-clamp-3 sm:line-clamp-4 pt-1">
              {overview}
            </p>

            {/* Action Buttons: Watch Now / Resume & Add to List */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 pt-2">
              {resumeInfo && resumeInfo.position > 0 && !resumeInfo.isCompleted ? (
                <>
                  <Link
                    href={
                      mediaType === "movie"
                        ? `/watch/movie/${id}?t=${resumeInfo.position}&resume=1`
                        : `/watch/${mediaType === "anime" ? "anime" : "tv"}/${id}?s=${resumeInfo.season}&e=${resumeInfo.episode}&t=${resumeInfo.position}&resume=1`
                    }
                    className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-[#FF3B6B] to-[#FF5A85] hover:brightness-110 text-white text-xs sm:text-sm font-black transition-all duration-200 shadow-xl shadow-[#FF3B6B]/30 hover:scale-105 active:scale-95 touch-manipulation cursor-pointer"
                  >
                    <IconPlay className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-white" />
                    <span>
                      {mediaType === "movie"
                        ? `Resume (${formatDuration(resumeInfo.position)})`
                        : `Resume S${resumeInfo.season} E${resumeInfo.episode} (${formatDuration(resumeInfo.position)})`}
                    </span>
                  </Link>

                  <Link
                    href={watchUrl}
                    className="px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-xs font-bold transition-all border border-white/10 touch-manipulation cursor-pointer"
                    title="Watch from beginning"
                  >
                    ↺ Start Over
                  </Link>
                </>
              ) : (
                <Link
                  href={watchUrl}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-[#FF3B6B] to-[#FF5A85] hover:brightness-110 text-white text-xs sm:text-sm font-black transition-all duration-200 shadow-xl shadow-[#FF3B6B]/30 hover:scale-105 active:scale-95 touch-manipulation cursor-pointer"
                >
                  <IconPlay className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-white" />
                  <span>{resumeInfo?.isCompleted ? "Watch Again" : "Watch Now"}</span>
                </Link>
              )}

              {trailerKey && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("chiller-trailer-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs sm:text-sm font-bold transition-all border border-white/10 touch-manipulation tap-instant active:scale-95 cursor-pointer"
                >
                  <span>🎬</span>
                  <span>Trailer</span>
                </button>
              )}

              {mediaType === "anime" && (
                <Link
                  href={`/watch/anime/${id}?s=${resumeInfo?.season || selectedSeason || 1}&e=${resumeInfo?.episode || 1}&audio=en`}
                  className="flex items-center gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-[#8A5CFF]/20 hover:bg-[#8A5CFF]/30 text-[#A78BFA] hover:text-white text-xs sm:text-sm font-bold transition-all border border-[#8A5CFF]/30 active:scale-95 touch-manipulation cursor-pointer"
                  title="Watch with English Dub audio"
                >
                  <span className="text-sm">🎙️</span>
                  <span>Watch in English</span>
                </Link>
              )}

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
              router.push(`/watch/${mediaType === "anime" ? "anime" : "tv"}/${id}?s=${selectedSeason}&e=${epNum}`);
            }}
            tmdbId={id}
            seasonNumber={selectedSeason}
          />
        </div>
      )}

      {/* ── Trailer Preview Section ── */}
      {trailerKey && (
        <div id="chiller-trailer-section" className="space-y-3">
          <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
            <span>🎬</span>
            <span>Official Trailer</span>
          </h3>
          <TrailerPreview
            trailerKey={trailerKey}
            title={title}
            backdropUrl={backdropUrl}
          />
        </div>
      )}

      {/* Cast Grid (Clickable to /person/[id]) */}
      {(activeTab === "overview" || activeTab === "cast") && cast.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0F172A] p-5 sm:p-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-4">
            Starring Cast
          </h3>
          <div className="flex gap-4 overflow-x-auto rail-track touch-pan-x pb-2">
            {cast.map((actor) => {
              const profileUrl = actor.profile_path
                ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                : "/placeholder-avatar.png";

              return (
                <Link
                  key={actor.id}
                  href={`/person/${actor.id}`}
                  className="flex flex-col items-center text-center shrink-0 w-20 group cursor-pointer tap-instant active:scale-95 transition-transform"
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

      {/* ── Centralized Ad Slot: Detail Bottom Banner ── */}
      <AdSlot placement="detail_bottom" />

      {/* ── 4. Similar Titles Rail ── */}
      {similarTitles.length > 0 && (
        <div>
          <MediaRail
            title="Similar Titles"
            items={similarTitles.map((r: any) => ({
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

      {/* ── 5. Recommended Content Rail ── */}
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
