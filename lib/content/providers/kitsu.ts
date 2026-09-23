/**
 * lib/content/providers/kitsu.ts
 *
 * KITSU ANIME METADATA PROVIDER
 *
 * Official documented public JSON:API (No API key required)
 * https://kitsu.docs.apiary.io/
 */

import { ChillerContent, ContentProvider, ContentProviderStatus } from "../types";

export class KitsuContentProvider implements ContentProvider {
  id = "kitsu";
  name = "Kitsu (Anime Discovery)";
  category = "anime" as const;
  enabled = true;
  requiresApiKey = false;
  priority = 4;

  private readonly BASE_URL = "https://kitsu.io/api/edge";

  async search(query: string): Promise<ChillerContent[]> {
    if (!this.enabled || !query.trim()) return [];

    try {
      const url = `${this.BASE_URL}/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=10`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          "User-Agent": "Chiller/2.0 (Anime Intelligence)",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const json = await res.json();
      if (!json.data || !Array.isArray(json.data)) return [];

      return json.data.map((item: any) => this.mapKitsuToContent(item));
    } catch {
      return [];
    }
  }

  async getAnime(id: string | number): Promise<ChillerContent | null> {
    if (!this.enabled) return null;

    try {
      const url = `${this.BASE_URL}/anime/${id}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          "User-Agent": "Chiller/2.0 (Anime Intelligence)",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return null;
      const json = await res.json();
      if (!json.data) return null;

      return this.mapKitsuToContent(json.data);
    } catch {
      return null;
    }
  }

  private mapKitsuToContent(item: any): ChillerContent {
    const attr = item.attributes || {};
    const title =
      attr.canonicalTitle ||
      attr.titles?.en ||
      attr.titles?.en_jp ||
      attr.titles?.ja_jp ||
      "Untitled Anime";

    const year = attr.startDate ? attr.startDate.split("-")[0] : "";

    return {
      id: `kitsu-anime-${item.id}`,
      type: "anime",
      title,
      originalTitle: attr.titles?.ja_jp,
      alternativeTitles: [
        attr.canonicalTitle,
        attr.titles?.en,
        attr.titles?.en_jp,
        attr.titles?.ja_jp,
        ...(attr.abbreviatedTitles || []),
      ].filter(Boolean),
      overview: attr.synopsis || "No description provided.",
      posterUrl:
        attr.posterImage?.large ||
        attr.posterImage?.original ||
        attr.posterImage?.medium ||
        "/placeholder-poster.png",
      backdropUrl: attr.coverImage?.large || attr.coverImage?.original || "",
      releaseDate: attr.startDate || "",
      year,
      genres: [],
      languages: ["Japanese"],
      originalLanguage: "ja",
      country: "Japan",
      rating: attr.averageRating ? Number((parseFloat(attr.averageRating) / 10).toFixed(1)) : 0,
      popularity: attr.popularityRank,
      externalIds: {
        kitsuId: String(item.id),
      },
      romajiTitle: attr.titles?.en_jp,
      englishTitle: attr.titles?.en,
      nativeTitle: attr.titles?.ja_jp,
      format: (attr.subtype || "TV").toUpperCase(),
      status: attr.status === "current" ? "RELEASING" : attr.status === "finished" ? "FINISHED" : "NOT_YET_RELEASED",
      totalEpisodes: attr.episodeCount,
      primarySource: "kitsu",
      enrichedSources: ["kitsu"],
      lastUpdated: new Date().toISOString(),
    };
  }

  async healthCheck(): Promise<{
    status: ContentProviderStatus;
    latencyMs?: number;
    message?: string;
  }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.BASE_URL}/anime?page[limit]=1`, {
        signal: AbortSignal.timeout(4000),
      });
      const latencyMs = Date.now() - start;
      return {
        status: res.ok ? "ACTIVE" : "DEGRADED",
        latencyMs,
      };
    } catch (err: any) {
      return {
        status: "FAILED",
        latencyMs: Date.now() - start,
        message: err.message,
      };
    }
  }
}
