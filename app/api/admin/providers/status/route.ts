import { NextResponse } from "next/server";
import { playbackRegistry } from "@/lib/playback/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const providers = playbackRegistry.getAllProviders().map((p) => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      priority: p.priority,
      requiresApiKey: p.requiresApiKey,
      supportsMovie: p.supportsMovie,
      supportsTV: p.supportsTV,
      supportsAnime: Boolean(p.supportsAnime),
    }));

    const healthStats = playbackRegistry.getHealthStats();

    return NextResponse.json({
      success: true,
      providers,
      healthStats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load providers" },
      { status: 500 }
    );
  }
}
