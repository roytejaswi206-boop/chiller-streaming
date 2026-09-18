import { NextResponse } from "next/server";
import { contentRegistry } from "@/lib/content/registry";
import { getTmdbApiKey } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tmdbKey = await getTmdbApiKey();
    const providers = contentRegistry.getAllProviders().map((p) => {
      let isConfigured = true;
      if (p.id === "tmdb") {
        isConfigured = Boolean(tmdbKey);
      } else if (p.id === "thetvdb") {
        isConfigured = Boolean(process.env.THETVDB_API_KEY?.trim());
      } else if (p.id === "watchmode") {
        isConfigured = Boolean(process.env.WATCHMODE_API_KEY?.trim());
      } else if (p.id === "opensubtitles") {
        isConfigured = Boolean(process.env.OPENSUBTITLES_API_KEY?.trim());
      }

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        enabled: p.enabled,
        requiresApiKey: p.requiresApiKey,
        isConfigured,
        priority: p.priority,
      };
    });

    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list content providers" },
      { status: 500 }
    );
  }
}
