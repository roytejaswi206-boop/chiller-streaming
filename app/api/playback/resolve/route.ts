import { NextRequest, NextResponse } from "next/server";
import { resolveCandidatesConcurrently } from "@/lib/playback/orchestrator";
import { resolveAnimePlayback as resolveDedicatedAnimePlayback } from "@/lib/playback/anime/anime-resolver";
import { classifyMedia, MediaClass } from "@/lib/playback/media-classifier";
import { PlaybackRequest } from "@/lib/playback/types";
import { playbackRegistry } from "@/lib/playback/registry";

export const dynamic = "force-dynamic";

interface ResolvePayload {
  mediaType?: "movie" | "tv" | "anime" | "video";
  mediaClass?: MediaClass;
  id?: string | number;
  tmdbId?: string | number;
  anilistId?: string | number;
  malId?: string | number;
  season?: number;
  episode?: number;
  language?: "sub" | "dub";
  variant?: "sub" | "dub" | "raw";
  audio?: string;
  format?: string;
}

async function handleResolve(payload: ResolvePayload) {
  const mediaType = payload.mediaType || (payload.mediaClass === "ANIME" ? "anime" : "movie");
  const rawId = payload.tmdbId || payload.id;
  const rawAnilistId = payload.anilistId || (mediaType === "anime" ? rawId : undefined);
  const season = Math.max(1, payload.season || 1);
  const episode = Math.max(1, payload.episode || 1);
  const variant = (payload.variant || (payload.language === "dub" || payload.audio === "en" ? "dub" : "sub")) as "sub" | "dub" | "raw";
  const language = payload.language || (variant === "dub" ? "dub" : "sub");
  const audio = payload.audio || (variant === "dub" ? "en" : undefined);

  if (!rawId && !rawAnilistId) {
    return NextResponse.json(
      { success: false, error: "tmdbId or anilistId is required" },
      { status: 400 }
    );
  }

  // 1. Canonical Media Classification
  const classification = classifyMedia({
    mediaType: mediaType as any,
    anilistId: rawAnilistId ? parseInt(String(rawAnilistId), 10) : undefined,
    malId: payload.malId ? parseInt(String(payload.malId), 10) : undefined,
    tmdbId: rawId ? String(rawId) : undefined,
    format: payload.format,
  });

  const start = Date.now();

  const { cdnRouter } = await import("@/lib/cdn/cdn-router");
  const cdnDelivery = cdnRouter.resolveMediaDelivery({
    mediaId: rawAnilistId || rawId || "stream",
    mediaType: mediaType as any,
  });

  // 2. POOL B: Anime Playback Pool (Strict Isolation)
  if (classification.targetPool === "ANIME" && (rawAnilistId || rawId)) {
    const { resolveAnimeAnilistId } = await import("@/lib/media/identity/id-mapper");
    const canonicalAnilistId = await resolveAnimeAnilistId({
      anilistId: rawAnilistId,
      tmdbId: rawId,
      malId: payload.malId,
    });
    const anilistId = canonicalAnilistId || parseInt(String(rawAnilistId || rawId), 10);
    const animeRes = await resolveDedicatedAnimePlayback({
      anilistId,
      tmdbId: rawId,
      malId: payload.malId,
      season,
      episode,
      language: variant === "dub" ? "dub" : "sub",
      variant,
      preferredAudio: audio,
      mediaType: classification.mediaClass === "ANIME_MOVIE" ? "movie" : "anime",
    });

    return NextResponse.json({
      success: true,
      poolUsed: "ANIME",
      mediaClass: classification.mediaClass,
      candidates: animeRes.sources,
      primaryCandidate: animeRes.primarySource,
      resolutionMs: animeRes.latencyMs || Date.now() - start,
      season,
      episode,
      language,
      variant: animeRes.variantRequested || variant,
      availableVariants: animeRes.availableVariants || { sub: true, dub: true, raw: false },
      providersConsidered: animeRes.providersConsidered,
      providersSkipped: animeRes.providersSkipped,
      cdn: {
        id: cdnDelivery.cdnId,
        name: cdnDelivery.cdnName,
        region: cdnDelivery.region,
        shieldEnabled: cdnDelivery.shieldEnabled,
      },
    });
  }

  // 3. POOL A: General Playback Pool (Movies / TV / Documentaries)
  const generalRequest: PlaybackRequest = {
    mediaType: mediaType as any,
    mediaClass: classification.mediaClass,
    targetPool: "GENERAL",
    tmdbId: rawId,
    season,
    episode,
    language,
    preferredAudio: audio,
  };

  const { candidates, primaryCandidate, fastestMs } = await resolveCandidatesConcurrently(generalRequest);

  const animeProviders = playbackRegistry.getAnimeProviders();
  const providersSkipped = animeProviders.map((p) => ({
    id: p.id,
    name: p.name,
    reason: "Anime-specific provider skipped for General Movie/TV request",
  }));

  return NextResponse.json({
    success: true,
    poolUsed: "GENERAL",
    mediaClass: classification.mediaClass,
    candidates,
    primaryCandidate,
    resolutionMs: fastestMs || Date.now() - start,
    season,
    episode,
    language,
    providersSkipped,
    cdn: {
      id: cdnDelivery.cdnId,
      name: cdnDelivery.cdnName,
      region: cdnDelivery.region,
      shieldEnabled: cdnDelivery.shieldEnabled,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const payload: ResolvePayload = {
      mediaType: (searchParams.get("type") || undefined) as any,
      mediaClass: (searchParams.get("mediaClass") || undefined) as any,
      id: searchParams.get("id") || undefined,
      tmdbId: searchParams.get("tmdbId") || undefined,
      anilistId: searchParams.get("anilistId") || undefined,
      malId: searchParams.get("malId") || undefined,
      season: parseInt(searchParams.get("s") || searchParams.get("season") || "1", 10),
      episode: parseInt(searchParams.get("e") || searchParams.get("episode") || "1", 10),
      language: (searchParams.get("lang") || searchParams.get("language") || "sub") as "sub" | "dub",
      variant: (searchParams.get("variant") || (searchParams.get("lang") === "dub" ? "dub" : "sub")) as "sub" | "dub" | "raw",
      audio: searchParams.get("audio") || undefined,
      format: searchParams.get("format") || undefined,
    };

    return await handleResolve(payload);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to resolve playback" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return await handleResolve(body);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to resolve playback" },
      { status: 500 }
    );
  }
}
