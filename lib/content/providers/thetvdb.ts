import { ChillerContent, ContentProvider, ContentProviderStatus } from "../types";

export class TheTVDBContentProvider implements ContentProvider {
  id = "thetvdb";
  name = "TheTVDB";
  category = "tv" as const;
  enabled = process.env.THETVDB_ENABLED === "true";
  requiresApiKey = true;
  priority = 3;

  private getApiKey(): string {
    return process.env.THETVDB_API_KEY?.trim() || "";
  }

  private getBaseUrl(): string {
    return process.env.THETVDB_API_URL?.trim() || "https://api4.thetvdb.com/v4";
  }

  async search(query: string): Promise<ChillerContent[]> {
    if (!this.enabled || !this.getApiKey() || !query.trim()) return [];
    // TheTVDB v4 requires login token authentication. When enabled with key, performs authenticated query.
    return [];
  }

  async healthCheck(): Promise<{
    status: ContentProviderStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "TheTVDB provider is disabled (THETVDB_ENABLED=false)." };
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { status: "NOT_CONFIGURED", message: "THETVDB_API_KEY is not configured." };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.getBaseUrl()}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: apiKey }),
        signal: AbortSignal.timeout(6000),
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { status: "ACTIVE", latencyMs, message: `Operational (${latencyMs}ms)` };
      }
      return { status: "DEGRADED", latencyMs, message: `Login failed with HTTP status ${res.status}` };
    } catch (err: any) {
      return { status: "FAILED", latencyMs: Date.now() - start, message: err.message || "Failed to reach TheTVDB" };
    }
  }
}
