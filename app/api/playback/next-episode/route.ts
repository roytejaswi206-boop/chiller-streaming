import { NextRequest, NextResponse } from "next/server";
import { resolveNextCanonicalEpisode } from "@/lib/playback/anime/episode-mapper";
import { getSeasonDetails, getTVDetails } from "@/lib/tmdb/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaType = searchParams.get("type") || "tv";
    const tmdbId = searchParams.get("tmdbId") || searchParams.get("id");
    const anilistId = searchParams.get("anilistId") || (mediaType === "anime" ? tmdbId : undefined);
    const currentSeason = parseInt(searchParams.get("s") || searchParams.get("season") || "1", 10);
    const currentEpisode = parseInt(searchParams.get("e") || searchParams.get("episode") || "1", 10);

    // 1. Anime next episode resolution via canonical AniList metadata
    if (mediaType === "anime" && anilistId) {
      const nextEp = await resolveNextCanonicalEpisode(anilistId, currentSeason, currentEpisode);
      return NextResponse.json({
        success: true,
        mediaType: "anime",
        currentSeason,
        currentEpisode,
        ...nextEp,
      });
    }

    // 2. TV next episode resolution via TMDB metadata
    if (tmdbId) {
      try {
        const [tv, seasonData] = await Promise.all([
          getTVDetails(tmdbId).catch(() => null),
          getSeasonDetails(tmdbId, currentSeason).catch(() => null),
        ]);

        if (seasonData?.episodes) {
          const currentIdx = seasonData.episodes.findIndex(
            (ep: any) => ep.episode_number === currentEpisode
          );

          if (currentIdx >= 0 && currentIdx < seasonData.episodes.length - 1) {
            const next = seasonData.episodes[currentIdx + 1];
            return NextResponse.json({
              success: true,
              mediaType: "tv",
              currentSeason,
              currentEpisode,
              hasNext: true,
              nextSeason: currentSeason,
              nextEpisode: next.episode_number,
              nextTitle: next.name,
              nextThumbnailUrl: next.still_path
                ? `https://image.tmdb.org/t/p/w300${next.still_path}`
                : undefined,
              isNewSeason: false,
            });
          }

          // Check if there is a next season
          const totalSeasons = tv?.number_of_seasons || 1;
          if (currentSeason < totalSeasons) {
            const nextSeasonData = await getSeasonDetails(tmdbId, currentSeason + 1).catch(() => null);
            const firstEp = nextSeasonData?.episodes?.[0];
            return NextResponse.json({
              success: true,
              mediaType: "tv",
              currentSeason,
              currentEpisode,
              hasNext: true,
              nextSeason: currentSeason + 1,
              nextEpisode: firstEp?.episode_number || 1,
              nextTitle: firstEp?.name || `Season ${currentSeason + 1} Premiere`,
              isNewSeason: true,
            });
          }

          return NextResponse.json({
            success: true,
            mediaType: "tv",
            currentSeason,
            currentEpisode,
            hasNext: false,
            nextSeason: currentSeason,
            nextEpisode: currentEpisode,
            isFinalEpisode: true,
          });
        }
      } catch {
        // Fallback
      }
    }

    // Fallback: standard linear progression
    return NextResponse.json({
      success: true,
      currentSeason,
      currentEpisode,
      hasNext: true,
      nextSeason: currentSeason,
      nextEpisode: currentEpisode + 1,
      isNewSeason: false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to resolve next episode" },
      { status: 500 }
    );
  }
}
