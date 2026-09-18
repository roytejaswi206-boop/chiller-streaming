import { NextRequest, NextResponse } from "next/server";
import { getSeasonDetails } from "@/lib/tmdb/client";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    const { searchParams } = new URL(req.url);
    const season = Math.max(1, parseInt(searchParams.get("season") || "1", 10));

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid content ID" }, { status: 400 });
    }

    const seasonData = await getSeasonDetails(id, season);
    const episodes = (seasonData.episodes || []).map((ep) => ({
      id: ep.id,
      episodeNumber: ep.episode_number,
      seasonNumber: ep.season_number,
      name: ep.name,
      overview: ep.overview,
      still: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null,
      airDate: ep.air_date,
      voteAverage: ep.vote_average,
      runtime: ep.runtime,
    }));

    return NextResponse.json({
      success: true,
      tvId: id,
      seasonNumber: season,
      totalEpisodes: episodes.length,
      episodes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load episodes" },
      { status: 500 }
    );
  }
}
