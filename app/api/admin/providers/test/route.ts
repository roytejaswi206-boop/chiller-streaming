import { NextResponse } from "next/server";
import { playbackRegistry } from "@/lib/playback/registry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { providerId, type = "health", tmdbId, season = 1, episode = 1 } = body;

    const provider = playbackRegistry.getProvider(providerId);
    if (!provider) {
      return NextResponse.json(
        { success: false, message: `Provider '${providerId}' not found.` },
        { status: 404 }
      );
    }

    const start = Date.now();

    if (type === "health") {
      const check = await provider.healthCheck();
      const isReachableOrActive = check.status === "ACTIVE" || check.status === "HTTP_REACHABLE";
      return NextResponse.json({
        success: isReachableOrActive,
        status: check.status,
        latencyMs: check.latencyMs || Date.now() - start,
        message: check.message || `Health check: ${check.status}`,
      });
    }

    if (type === "movie") {
      const id = tmdbId || 550; // default Fight Club
      const source = await provider.resolve({ mediaType: "movie", tmdbId: id });
      if (!source) {
        return NextResponse.json({
          success: false,
          status: "FAILED",
          url: "",
          message: `Provider '${provider.name}' could not generate movie playback source.`,
        });
      }

      // Validate HTTP reachability
      let httpStatus = 0;
      let reachabilityMessage = "";
      try {
        const res = await fetch(source.url, {
          method: "HEAD",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(6000),
        });
        httpStatus = res.status;
        reachabilityMessage = `HTTP ${res.status}`;
      } catch (e: any) {
        reachabilityMessage = e.message || "Connection failed";
      }

      const latencyMs = Date.now() - start;
      const isPass = httpStatus >= 200 && httpStatus < 400;

      return NextResponse.json({
        success: isPass,
        status: isPass ? "HTTP_REACHABLE" : "FAIL",
        verification: isPass ? "PLAYER_NOT_VERIFIABLE" : "UNREACHABLE",
        url: source.url,
        httpStatus,
        latencyMs,
        message: isPass
          ? `Source reached (HTTP ${httpStatus}, ${latencyMs}ms). Cross-origin iframe boundaries prevent observing internal video state server-side (PLAYER_NOT_VERIFIABLE).`
          : `Source reachable check failed: ${reachabilityMessage}`,
      });
    }

    if (type === "tv") {
      const id = tmdbId || 1399; // default Game of Thrones
      const s = season || 1;
      const e = episode || 1;
      const source = await provider.resolve({ mediaType: "tv", tmdbId: id, season: s, episode: e });
      if (!source) {
        return NextResponse.json({
          success: false,
          status: "FAILED",
          url: "",
          message: `Provider '${provider.name}' could not generate TV episode playback source.`,
        });
      }

      // Validate HTTP reachability
      let httpStatus = 0;
      let reachabilityMessage = "";
      try {
        const res = await fetch(source.url, {
          method: "HEAD",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(6000),
        });
        httpStatus = res.status;
        reachabilityMessage = `HTTP ${res.status}`;
      } catch (e: any) {
        reachabilityMessage = e.message || "Connection failed";
      }

      const latencyMs = Date.now() - start;
      const isPass = httpStatus >= 200 && httpStatus < 400;

      return NextResponse.json({
        success: isPass,
        status: isPass ? "HTTP_REACHABLE" : "FAIL",
        verification: isPass ? "PLAYER_NOT_VERIFIABLE" : "UNREACHABLE",
        url: source.url,
        httpStatus,
        latencyMs,
        message: isPass
          ? `Source reached (HTTP ${httpStatus}, ${latencyMs}ms). Cross-origin iframe boundaries prevent observing internal video state server-side (PLAYER_NOT_VERIFIABLE).`
          : `Source reachable check failed: ${reachabilityMessage}`,
      });
    }

    if (type === "anime") {
      if (!provider.supportsAnime || !provider.getAnimePlayback) {
        return NextResponse.json({
          success: false,
          status: "NOT_SUPPORTED",
          message: `Provider '${provider.name}' does not support Anime playback.`,
        });
      }

      const anilistId = 21; // One Piece Ep 1
      const ep = 1;
      const source = await provider.getAnimePlayback(anilistId, ep);
      if (!source) {
        return NextResponse.json({
          success: false,
          status: "FAILED",
          url: "",
          message: `Provider '${provider.name}' could not generate anime playback source.`,
        });
      }

      let httpStatus = 0;
      let reachabilityMessage = "";
      try {
        const res = await fetch(source.url, {
          method: "HEAD",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(6000),
        });
        httpStatus = res.status;
        reachabilityMessage = `HTTP ${res.status}`;
      } catch (e: any) {
        reachabilityMessage = e.message || "Connection failed";
      }

      const latencyMs = Date.now() - start;
      const isPass = httpStatus >= 200 && httpStatus < 400;

      return NextResponse.json({
        success: isPass,
        status: isPass ? "HTTP_REACHABLE" : "FAIL",
        verification: isPass ? "PLAYER_NOT_VERIFIABLE" : "UNREACHABLE",
        url: source.url,
        httpStatus,
        latencyMs,
        message: isPass
          ? `Anime source reached (HTTP ${httpStatus}, ${latencyMs}ms). Cross-origin iframe boundaries prevent observing internal video state server-side (PLAYER_NOT_VERIFIABLE).`
          : `Anime source reachable check failed: ${reachabilityMessage}`,
      });
    }

    return NextResponse.json(
      { success: false, message: `Unknown test type: ${type}` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Test execution error" },
      { status: 500 }
    );
  }
}
