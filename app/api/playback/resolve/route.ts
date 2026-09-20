import { NextRequest, NextResponse } from "next/server";
import { resolveCandidatesConcurrently } from "@/lib/playback/orchestrator";
import { PlaybackRequest } from "@/lib/playback/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaType = (searchParams.get("type") || "movie") as "movie" | "tv" | "anime";
    const tmdbId = searchParams.get("tmdbId") || searchParams.get("id");
    const anilistId = searchParams.get("anilistId");
    const season = parseInt(searchParams.get("s") || searchParams.get("season") || "1", 10);
    const episode = parseInt(searchParams.get("e") || searchParams.get("episode") || "1", 10);
    const language = (searchParams.get("lang") || searchParams.get("language") || "sub") as "sub" | "dub";

    if (!tmdbId && !anilistId) {
      return NextResponse.json({ success: false, error: "tmdbId or anilistId is required" }, { status: 400 });
    }

    const request: PlaybackRequest = {
      mediaType,
      tmdbId: tmdbId || undefined,
      anilistId: anilistId ? parseInt(anilistId, 10) : undefined,
      season,
      episode,
      language,
    };

    const start = Date.now();
    const { candidates, primaryCandidate, fastestMs } = await resolveCandidatesConcurrently(request);

    return NextResponse.json({
      success: true,
      candidates,
      primaryCandidate,
      resolutionMs: fastestMs || Date.now() - start,
      season,
      episode,
      language,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to resolve playback" },
      { status: 500 }
    );
  }
}
