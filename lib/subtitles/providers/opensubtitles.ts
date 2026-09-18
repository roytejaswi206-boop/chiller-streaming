export interface SubtitleTrack {
  id: string;
  language: string;
  languageCode: string;
  format: string;
  downloadUrl: string;
  fileName?: string;
  provider: string;
  isHearingImpaired?: boolean;
}

export class OpenSubtitlesProvider {
  id = "opensubtitles";
  name = "OpenSubtitles";
  enabled = process.env.OPENSUBTITLES_ENABLED === "true";
  requiresApiKey = true;

  private getApiKey(): string {
    return process.env.OPENSUBTITLES_API_KEY?.trim() || "";
  }

  private getBaseUrl(): string {
    return process.env.OPENSUBTITLES_API_URL?.trim() || "https://api.opensubtitles.com/api/v1";
  }

  async searchSubtitles(params: {
    tmdbId?: number;
    imdbId?: string;
    season?: number;
    episode?: number;
    languages?: string[];
  }): Promise<SubtitleTrack[]> {
    if (!this.enabled) return [];
    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    try {
      const url = new URL(`${this.getBaseUrl()}/subtitles`);
      if (params.tmdbId) url.searchParams.set("tmdb_id", String(params.tmdbId));
      if (params.imdbId) url.searchParams.set("imdb_id", params.imdbId.replace(/^tt/, ""));
      if (params.season) url.searchParams.set("season_number", String(params.season));
      if (params.episode) url.searchParams.set("episode_number", String(params.episode));
      if (params.languages && params.languages.length > 0) {
        url.searchParams.set("languages", params.languages.join(","));
      }

      const res = await fetch(url.toString(), {
        headers: {
          "Api-Key": apiKey,
          "User-Agent": "Chiller v2.0",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return [];
      const json = await res.json();
      if (!json.data || !Array.isArray(json.data)) return [];

      return json.map((item: any) => ({
        id: item.id || item.attributes?.files?.[0]?.file_id,
        language: item.attributes?.language || "Unknown",
        languageCode: item.attributes?.language_code || "en",
        format: "srt",
        downloadUrl: item.attributes?.files?.[0]?.file_url || "",
        fileName: item.attributes?.files?.[0]?.file_name,
        provider: "opensubtitles",
        isHearingImpaired: Boolean(item.attributes?.hearing_impaired),
      }));
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<{
    status: "ACTIVE" | "DEGRADED" | "FAILED" | "NOT_CONFIGURED" | "DISABLED";
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "OpenSubtitles is disabled (OPENSUBTITLES_ENABLED=false)." };
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { status: "NOT_CONFIGURED", message: "OPENSUBTITLES_API_KEY is not configured." };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.getBaseUrl()}/infos/user`, {
        headers: { "Api-Key": apiKey, "User-Agent": "Chiller v2.0" },
        signal: AbortSignal.timeout(6000),
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { status: "ACTIVE", latencyMs, message: `Operational (${latencyMs}ms)` };
      }
      return { status: "DEGRADED", latencyMs, message: `Returned HTTP status ${res.status}` };
    } catch (err: any) {
      return { status: "FAILED", latencyMs: Date.now() - start, message: err.message || "Failed to reach OpenSubtitles" };
    }
  }
}

export const openSubtitles = new OpenSubtitlesProvider();
