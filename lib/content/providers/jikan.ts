import { ChillerContent, ContentProvider, ContentProviderStatus } from "../types";

export class JikanContentProvider implements ContentProvider {
  id = "jikan";
  name = "Jikan (MyAnimeList Gateway)";
  category = "anime" as const;
  enabled = process.env.JIKAN_ENABLED !== "false";
  requiresApiKey = false;
  priority = 3;

  private getBaseUrl(): string {
    return process.env.JIKAN_API_URL?.trim() || "https://api.jikan.moe/v4";
  }

  async search(query: string): Promise<ChillerContent[]> {
    if (!this.enabled || !query.trim()) return [];

    try {
      const url = `${this.getBaseUrl()}/anime?q=${encodeURIComponent(query)}&limit=10`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Chiller/2.0" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return [];
      const json = await res.json();
      if (!json.data || !Array.isArray(json.data)) return [];

      return json.data.map((item: any) => this.mapJikanToContent(item));
    } catch {
      return [];
    }
  }

  async getAnime(id: number | string): Promise<ChillerContent | null> {
    if (!this.enabled) return null;

    try {
      const url = `${this.getBaseUrl()}/anime/${id}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Chiller/2.0" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return null;
      const json = await res.json();
      if (!json.data) return null;

      return this.mapJikanToContent(json.data);
    } catch {
      return null;
    }
  }

  private mapJikanToContent(item: any): ChillerContent {
    const title = item.title_english || item.title || item.title_japanese || "Untitled Anime";
    const year = item.year ? String(item.year) : item.aired?.from ? item.aired.from.split("-")[0] : "";

    return {
      id: `jikan-mal-${item.mal_id}`,
      type: "anime",
      title,
      originalTitle: item.title_japanese,
      alternativeTitles: [item.title, item.title_english, item.title_japanese].filter(Boolean),
      overview: item.synopsis || "No synopsis available.",
      posterUrl: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || "/placeholder-poster.png",
      backdropUrl: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || "",
      releaseDate: item.aired?.from ? item.aired.from.split("T")[0] : "",
      year,
      genres: item.genres?.map((g: any) => g.name) || [],
      languages: ["Japanese"],
      originalLanguage: "ja",
      country: "Japan",
      rating: item.score ? Number(item.score.toFixed(1)) : 0,
      popularity: item.popularity,
      externalIds: {
        malId: item.mal_id,
      },
      romajiTitle: item.title,
      englishTitle: item.title_english,
      nativeTitle: item.title_japanese,
      format: item.type,
      status: item.status,
      studios: item.studios?.map((s: any) => s.name) || [],
      totalEpisodes: item.episodes,
      primarySource: "jikan",
      enrichedSources: ["jikan"],
      lastUpdated: new Date().toISOString(),
    };
  }

  async healthCheck(): Promise<{
    status: ContentProviderStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "Jikan provider is disabled." };
    }

    const start = Date.now();
    try {
      const url = `${this.getBaseUrl()}/anime/1`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Chiller/2.0" },
        signal: AbortSignal.timeout(6000),
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return {
          status: "ACTIVE",
          latencyMs,
          message: `Operational (${latencyMs}ms)`,
        };
      }
      return {
        status: "DEGRADED",
        latencyMs,
        message: `HTTP ${res.status}: Public API rate limit or gateway error`,
      };
    } catch (err: any) {
      return {
        status: "FAILED",
        latencyMs: Date.now() - start,
        message: err.message || "Failed to reach Jikan",
      };
    }
  }
}
