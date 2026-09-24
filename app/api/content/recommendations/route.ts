import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/lib/content/recommendations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaType = (searchParams.get("type") || searchParams.get("mediaType") || "movie") as "movie" | "tv" | "anime";
    const mediaId = searchParams.get("id") || searchParams.get("mediaId") || undefined;
    const tmdbIdStr = searchParams.get("tmdbId");
    const anilistIdStr = searchParams.get("anilistId");
    const tmdbId = tmdbIdStr ? parseInt(tmdbIdStr, 10) : undefined;
    const anilistId = anilistIdStr ? parseInt(anilistIdStr, 10) : undefined;
    const title = searchParams.get("title") || undefined;
    const genresRaw = searchParams.get("genres");
    const genres = genresRaw ? genresRaw.split(",").map((g) => g.trim()) : [];
    const limit = parseInt(searchParams.get("limit") || "18", 10);
    const section = searchParams.get("section") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const debug = searchParams.get("debug") === "true" || searchParams.get("debug") === "1";

    const result = await getRecommendations({
      mediaType,
      mediaId,
      tmdbId,
      anilistId,
      title,
      genres,
      limit,
      section,
      userId,
      debug,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    });
  } catch (error: any) {
    console.error("Recommendations API error:", error);
    return NextResponse.json(
      {
        sections: [],
        totalCount: 0,
        dedupedCount: 0,
        cached: false,
        error: error.message || "Failed to generate recommendations",
      },
      { status: 500 }
    );
  }
}
