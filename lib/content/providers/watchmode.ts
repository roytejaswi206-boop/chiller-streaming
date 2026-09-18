import { ChillerAvailability, ContentProvider, ContentProviderStatus, WhereToWatchProvider } from "../types";

export class WatchmodeAvailabilityProvider implements ContentProvider {
  id = "watchmode";
  name = "Watchmode (Where to Watch)";
  category = "availability" as const;
  enabled = process.env.WATCHMODE_ENABLED === "true";
  requiresApiKey = true;
  priority = 1;

  private getApiKey(): string {
    return process.env.WATCHMODE_API_KEY?.trim() || "";
  }

  private getBaseUrl(): string {
    return process.env.WATCHMODE_API_URL?.trim() || "https://api.watchmode.com/v1";
  }

  async search(): Promise<any[]> {
    return [];
  }

  async getAvailability(tmdbId: number, type: "movie" | "tv"): Promise<ChillerAvailability | null> {
    if (!this.enabled) return null;
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      // 1. Search title by TMDB ID
      const tmdbType = type === "movie" ? "movie" : "tv";
      const titleUrl = `${this.getBaseUrl()}/title/${tmdbType}-${tmdbId}/sources/?apiKey=${encodeURIComponent(apiKey)}`;
      const res = await fetch(titleUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return null;
      const sources: any[] = await res.json();
      if (!Array.isArray(sources)) return null;

      const streamProviders: WhereToWatchProvider[] = [];
      const rentProviders: WhereToWatchProvider[] = [];
      const buyProviders: WhereToWatchProvider[] = [];

      for (const s of sources) {
        const item: WhereToWatchProvider = {
          id: s.source_id || s.name,
          name: s.name,
          type: s.type === "sub" ? "sub" : s.type === "rent" ? "rent" : s.type === "buy" ? "buy" : "free",
          webUrl: s.web_url,
          format: s.format,
          price: s.price ? `$${s.price}` : undefined,
        };

        if (s.type === "sub" || s.type === "free") {
          streamProviders.push(item);
        } else if (s.type === "rent") {
          rentProviders.push(item);
        } else if (s.type === "buy") {
          buyProviders.push(item);
        }
      }

      return {
        title: `TMDB ID ${tmdbId}`,
        country: "US",
        lastUpdated: new Date().toISOString(),
        streamProviders,
        rentProviders,
        buyProviders,
      };
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<{
    status: ContentProviderStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "Watchmode is disabled (WATCHMODE_ENABLED=false)." };
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { status: "NOT_CONFIGURED", message: "WATCHMODE_API_KEY is not configured." };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.getBaseUrl()}/status/?apiKey=${encodeURIComponent(apiKey)}`, {
        signal: AbortSignal.timeout(6000),
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { status: "ACTIVE", latencyMs, message: `Operational (${latencyMs}ms)` };
      }
      return { status: "DEGRADED", latencyMs, message: `Returned HTTP status ${res.status}` };
    } catch (err: any) {
      return { status: "FAILED", latencyMs: Date.now() - start, message: err.message || "Failed to reach Watchmode" };
    }
  }
}
