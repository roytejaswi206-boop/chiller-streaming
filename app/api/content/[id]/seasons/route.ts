import { NextRequest, NextResponse } from "next/server";
import { getTVDetails } from "@/lib/tmdb/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid content ID" }, { status: 400 });
    }

    const show = await getTVDetails(id);
    const seasons = (show.seasons || []).map((s) => ({
      id: s.id,
      seasonNumber: s.season_number,
      name: s.name,
      overview: s.overview,
      poster: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : null,
      episodeCount: s.episode_count,
      airDate: s.air_date,
    }));

    return NextResponse.json({
      success: true,
      tvId: id,
      totalSeasons: seasons.length,
      seasons,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load seasons" },
      { status: 500 }
    );
  }
}
