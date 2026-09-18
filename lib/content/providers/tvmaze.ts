import { ChillerContent, ChillerEpisode, ChillerSeason, ContentProvider, ContentProviderStatus } from "../types";

export class TVmazeContentProvider implements ContentProvider {
  id = "tvmaze";
  name = "TVmaze (TV Intelligence)";
  category = "tv" as const;
  enabled = process.env.TVMAZE_ENABLED !== "false";
  requiresApiKey = false;
  priority = 2;

  private getBaseUrl(): string {
    return process.env.TVMAZE_API_URL?.trim() || "https://api.tvmaze.com";
  }

  async search(query: string): Promise<ChillerContent[]> {
    if (!this.enabled || !query.trim()) return [];

    try {
      const url = `${this.getBaseUrl()}/search/shows?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Chiller/2.0" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return [];
      const json = await res.json();
      if (!Array.isArray(json)) return [];

      return json.map((entry: any) => this.mapShowToContent(entry.show));
    } catch {
      return [];
    }
  }

  async getTV(id: number | string): Promise<ChillerContent | null> {
    if (!this.enabled) return null;

    try {
      const url = `${this.getBaseUrl()}/shows/${id}?embed[]=cast&embed[]=episodes`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Chiller/2.0" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return null;
      const show = await res.json();
      return this.mapShowToContent(show);
    } catch {
      return null;
    }
  }

  async getSeason(id: number | string, seasonNumber: number): Promise<ChillerSeason | null> {
    if (!this.enabled) return null;

    try {
      const url = `${this.getBaseUrl()}/shows/${id}/episodes`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Chiller/2.0" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return null;
      const episodes = await res.json();
      if (!Array.isArray(episodes)) return null;

      const seasonEpisodes = episodes.filter((ep: any) => ep.season === seasonNumber);
      if (seasonEpisodes.length === 0) return null;

      return {
        seasonNumber,
        name: `Season ${seasonNumber}`,
        episodeCount: seasonEpisodes.length,
        episodes: seasonEpisodes.map((ep: any) => ({
          id: ep.id,
          episodeNumber: ep.number,
          seasonNumber: ep.season,
          title: ep.name,
          overview: ep.summary?.replace(/<[^>]*>/g, "") || "",
          airDate: ep.airdate,
          thumbnailUrl: ep.image?.medium || ep.image?.original,
          rating: ep.rating?.average,
          runtime: ep.runtime,
        })),
      };
    } catch {
      return null;
    }
  }

  private mapShowToContent(show: any): ChillerContent {
    const title = show.name || "Untitled Show";
    const year = show.premiered ? show.premiered.split("-")[0] : "";

    return {
      id: `tvmaze-show-${show.id}`,
      type: "tv",
      title,
      originalTitle: show.name,
      overview: show.summary?.replace(/<[^>]*>/g, "") || "No overview available.",
      posterUrl: show.image?.original || show.image?.medium || "/placeholder-poster.png",
      backdropUrl: show.image?.original || "",
      releaseDate: show.premiered || "",
      year,
      genres: show.genres || [],
      languages: show.language ? [show.language] : [],
      country: show.network?.country?.name || show.webChannel?.country?.name || "",
      rating: show.rating?.average ? Number(show.rating.average.toFixed(1)) : 0,
      status: show.status,
      runtime: show.runtime || show.averageRuntime,
      externalIds: {
        tvmazeId: show.id,
        imdbId: show.externals?.imdb,
        tvdbId: show.externals?.thetvdb,
      },
      cast: show._embedded?.cast?.slice(0, 10).map((c: any) => ({
        id: c.person?.id,
        name: c.person?.name,
        character: c.character?.name,
        profileUrl: c.person?.image?.medium,
      })),
      primarySource: "tvmaze",
      enrichedSources: ["tvmaze"],
      lastUpdated: new Date().toISOString(),
    };
  }

  async healthCheck(): Promise<{
    status: ContentProviderStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "TVmaze provider is disabled." };
    }

    const start = Date.now();
    try {
      const url = `${this.getBaseUrl()}/shows/1`;
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
        message: `Returned HTTP status ${res.status}`,
      };
    } catch (err: any) {
      return {
        status: "FAILED",
        latencyMs: Date.now() - start,
        message: err.message || "Failed to reach TVmaze",
      };
    }
  }
}
