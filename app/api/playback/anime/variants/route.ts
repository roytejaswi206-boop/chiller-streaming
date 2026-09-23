import { NextRequest, NextResponse } from "next/server";
import { playbackRegistry } from "@/lib/playback/registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/playback/anime/variants
 * Lightweight language availability query for a canonical anime episode.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const anilistId = searchParams.get("anilistId") || searchParams.get("id");
    const season = parseInt(searchParams.get("s") || searchParams.get("season") || "1", 10);
    const episode = parseInt(searchParams.get("e") || searchParams.get("episode") || "1", 10);

    if (!anilistId) {
      return NextResponse.json(
        { success: false, error: "anilistId is required" },
        { status: 400 }
      );
    }

    const animeProviders = playbackRegistry.getAnimeProviders().filter((p) => p.enabled);

    const hasSub = animeProviders.some((p) => p.getCapabilities().supportsSub);
    const hasDub = animeProviders.some((p) => p.getCapabilities().supportsDub);
    const hasRaw = animeProviders.some((p) => Boolean(p.getCapabilities().supportsRaw));

    return NextResponse.json({
      success: true,
      anilistId,
      season,
      episode,
      variants: {
        sub: { available: hasSub },
        dub: { available: hasDub },
        raw: { available: hasRaw },
      },
      availableVariants: [
        ...(hasSub ? ["sub"] : []),
        ...(hasDub ? ["dub"] : []),
        ...(hasRaw ? ["raw"] : []),
      ],
      preferred: "sub",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query anime variants" },
      { status: 500 }
    );
  }
}
