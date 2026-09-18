import { PlaybackProvider, ProviderHealth, ProviderHealthStatus } from "./types";
import { CineSrcProvider } from "./providers/cinesrc";
import { VidSrcProvider } from "./providers/vidsrc";
import { VidkingProvider } from "./providers/vidking";
import { CodeSpecterProvider } from "./providers/codespecter";
import { AggregatorProvider } from "./providers/aggregator";
import { NHDProvider } from "./providers/nhd";

/**
 * CHILLER PLAYBACK PROVIDER REGISTRY
 *
 * Resolution priority order (ALWAYS iterate all — one failure ≠ global failure):
 *   1. CineSrc     (priority 1) — free, no key, documented events
 *   2. VidSrc      (priority 2) — free, no key, vidsrc.sbs
 *   3. Vidking     (priority 3) — optional (VIDKING_ENABLED=true)
 *   4. CodeSpecter (priority 4) — optional (CODESPECTER_API_KEY)
 *   5. Aggregator  (priority 5) — optional (PLAYBACK_AGGREGATOR_URL)
 *   6. NHD         (priority 6) — optional (anime support)
 *
 * A provider being marked DEGRADED or FAILED in healthStats does NOT remove it
 * from URL candidate generation. Health state is advisory for dashboards only.
 * The browser iframe is the real arbiter of playback success.
 */
class ProviderRegistry {
  private providers: Map<string, PlaybackProvider> = new Map();
  private healthStats: Map<string, ProviderHealth> = new Map();

  // TTL for failure state in ms — failures auto-expire after this duration
  private readonly FAILURE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private failureTimestamps: Map<string, number> = new Map();

  constructor() {
    // Register in priority order: lower number = tried first
    this.register(new CineSrcProvider());
    this.register(new VidSrcProvider());
    this.register(new VidkingProvider());
    this.register(new CodeSpecterProvider());
    this.register(new AggregatorProvider());
    this.register(new NHDProvider());
  }

  register(provider: PlaybackProvider) {
    this.providers.set(provider.id, provider);
    if (!this.healthStats.has(provider.id)) {
      this.healthStats.set(provider.id, {
        status: provider.requiresApiKey ? "NOT_CONFIGURED" : "ACTIVE",
        lastCheck: new Date().toISOString(),
        totalSuccess: 0,
        totalFailures: 0,
      });
    }
  }

  getProvider(id: string): PlaybackProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): PlaybackProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Returns enabled providers for URL candidate generation.
   *
   * CRITICAL: A provider with healthStats.status === "FAILED" or "DEGRADED"
   * is still included if it is .enabled. Server-side health checks should NEVER
   * permanently remove a provider from candidate generation.
   *
   * Providers are excluded only when:
   *   - provider.enabled === false (explicit env flag)
   */
  getEnabledProviders(): PlaybackProvider[] {
    return this.getAllProviders().filter((p) => p.enabled);
  }

  setProviderPriority(id: string, priority: number) {
    const p = this.providers.get(id);
    if (p) p.priority = priority;
  }

  setProviderEnabled(id: string, enabled: boolean) {
    const p = this.providers.get(id);
    if (p) {
      p.enabled = enabled;
      const stats = this.healthStats.get(id);
      if (stats && !enabled) stats.status = "DISABLED";
    }
  }

  recordSuccess(providerId: string) {
    const stats = this.healthStats.get(providerId);
    if (stats) {
      stats.totalSuccess++;
      stats.lastSuccessfulPlayback = new Date().toISOString();
      stats.status = "ACTIVE";
      stats.lastError = undefined;
      // Clear failure timestamp on success
      this.failureTimestamps.delete(providerId);
    }
  }

  /**
   * Records a resolver failure for diagnostics.
   *
   * IMPORTANT: This does NOT disable the provider for future resolutions.
   * It only updates healthStats status for dashboard display.
   * Failures expire after FAILURE_TTL_MS automatically.
   */
  recordFailure(providerId: string, error: string) {
    const stats = this.healthStats.get(providerId);
    if (!stats) return;

    stats.totalFailures++;
    stats.lastError = error;

    const now = Date.now();
    this.failureTimestamps.set(providerId, now);

    // Only mark degraded — never permanently FAILED from resolver errors
    stats.status = "DEGRADED";
  }

  /**
   * Auto-expire DEGRADED status after TTL so providers remain in rotation.
   */
  private isFailureExpired(providerId: string): boolean {
    const ts = this.failureTimestamps.get(providerId);
    if (!ts) return true;
    return Date.now() - ts > this.FAILURE_TTL_MS;
  }

  getHealthStats(): Record<string, ProviderHealth> {
    const result: Record<string, ProviderHealth> = {};
    for (const [id, health] of this.healthStats.entries()) {
      // Auto-recover DEGRADED providers after TTL
      const entry = { ...health };
      if (entry.status === "DEGRADED" && this.isFailureExpired(id)) {
        entry.status = "ACTIVE";
      }
      result[id] = entry;
    }
    return result;
  }

  async runHealthCheck(
    providerId?: string
  ): Promise<Record<string, { status: ProviderHealthStatus; latencyMs?: number; message?: string }>> {
    const targets = providerId
      ? ([this.providers.get(providerId)].filter(Boolean) as PlaybackProvider[])
      : this.getAllProviders();

    const results: Record<string, { status: ProviderHealthStatus; latencyMs?: number; message?: string }> = {};

    await Promise.allSettled(
      targets.map(async (provider) => {
        try {
          const check = await provider.healthCheck();
          results[provider.id] = check;

          const stats = this.healthStats.get(provider.id);
          if (stats) {
            // Advisory update only — DEGRADED/FAILED from server probe does NOT remove from candidate pool
            stats.status = check.status;
            stats.latencyMs = check.latencyMs;
            stats.lastCheck = new Date().toISOString();
            if (check.status === "FAILED") {
              stats.lastError = check.message;
            }
          }
        } catch (err: any) {
          results[provider.id] = {
            status: "DEGRADED",
            message: `Health probe error: ${err.message || "Unknown"}`,
          };
        }
      })
    );

    return results;
  }
}

// Global singleton instance
export const playbackRegistry = new ProviderRegistry();
