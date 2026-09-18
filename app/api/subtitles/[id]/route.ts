import { NextRequest, NextResponse } from "next/server";
import { openSubtitles } from "@/lib/subtitles/providers/opensubtitles";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const id = params.id;
    const { searchParams } = new URL(req.url);

    const season = searchParams.get("season") ? parseInt(searchParams.get("season")!, 10) : undefined;
    const episode = searchParams.get("episode") ? parseInt(searchParams.get("episode")!, 10) : undefined;
    const langs = searchParams.get("languages")?.split(",").map((l) => l.trim()) || ["en"];

    const isNumeric = /^\d+$/.test(id);
    const tmdbId = isNumeric ? parseInt(id, 10) : undefined;
    const imdbId = !isNumeric ? id : undefined;

    if (!openSubtitles.enabled) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: "OpenSubtitles is optional and not currently enabled (OPENSUBTITLES_ENABLED=false).",
        subtitles: [],
      });
    }

    const subtitles = await openSubtitles.searchSubtitles({
      tmdbId,
      imdbId,
      season,
      episode,
      languages: langs,
    });

    return NextResponse.json({
      success: true,
      configured: true,
      total: subtitles.length,
      subtitles,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query subtitles" },
      { status: 500 }
    );
  }
}
