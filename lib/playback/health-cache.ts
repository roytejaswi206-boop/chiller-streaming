import { ProviderHealth, ProviderHealthStatus } from "./types";

interface ProviderHealthMetrics {
  providerId: string;
  status: ProviderHealthStatus;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  subSuccessCount: number;
  subFailureCount: number;
  dubSuccessCount: number;
  dubFailureCount: number;
  lastSuccess?: string;
  lastFailure?: string;
  lastError?: string;
  averageStartupMs: number;
  recentStartupMs: number;
  latencies: number[];
  cooldownUntil?: number;
}

class ProviderHealthCache {
  private healthMap = new Map<string, ProviderHealthMetrics>();
  // Cooldown duration: 2 minutes after 3 consecutive failures
  private readonly COOLDOWN_DURATION_MS = 2 * 60 * 1000;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  private getOrCreate(providerId: string): ProviderHealthMetrics {
    let entry = this.healthMap.get(providerId);
    if (!entry) {
      entry = {
        providerId,
        status: "ACTIVE",
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        subSuccessCount: 0,
        subFailureCount: 0,
        dubSuccessCount: 0,
        dubFailureCount: 0,
        averageStartupMs: 1200,
        recentStartupMs: 1200,
        latencies: [],
      };
      this.healthMap.set(providerId, entry);
    }
    return entry;
  }

  recordSuccess(providerId: string, latencyMs?: number, variant?: string): void {
    const entry = this.getOrCreate(providerId);
    entry.successCount++;
    entry.consecutiveFailures = 0;
    entry.lastSuccess = new Date().toISOString();
    entry.status = "ACTIVE";
    entry.cooldownUntil = undefined;

    if (variant === "dub") {
      entry.dubSuccessCount++;
    } else {
      entry.subSuccessCount++;
    }

    if (latencyMs && latencyMs > 0) {
      entry.latencies.push(latencyMs);
      if (entry.latencies.length > 20) entry.latencies.shift();
      entry.recentStartupMs = latencyMs;
      entry.averageStartupMs = Math.round(
        entry.latencies.reduce((a, b) => a + b, 0) / entry.latencies.length
      );
    }
  }

  recordFailure(providerId: string, error?: string, variant?: string): void {
    const entry = this.getOrCreate(providerId);
    entry.failureCount++;
    entry.consecutiveFailures++;
    entry.lastFailure = new Date().toISOString();
    entry.lastError = error || "Playback or resolution failure";

    if (variant === "dub") {
      entry.dubFailureCount++;
    } else {
      entry.subFailureCount++;
    }

    if (entry.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      entry.cooldownUntil = Date.now() + this.COOLDOWN_DURATION_MS;
      entry.status = "DEGRADED";
    }
  }

  isCooldown(providerId: string): boolean {
    const entry = this.healthMap.get(providerId);
    if (!entry || !entry.cooldownUntil) return false;

    if (Date.now() > entry.cooldownUntil) {
      entry.cooldownUntil = undefined;
      entry.consecutiveFailures = 0;
      entry.status = "ACTIVE";
      return false;
    }
    return true;
  }

  /**
   * Calculates a dynamic provider score for sorting candidates.
   * Higher score = attempted/mounted earlier.
   */
  calculateScore(
    providerId: string,
    options: {
      mediaType?: string;
      language?: string;
      variant?: string;
      hasLanguageSupport?: boolean;
    } = {}
  ): number {
    const entry = this.getOrCreate(providerId);
    if (this.isCooldown(providerId)) {
      return 10; // Low score during temporary cooldown
    }

    let score = 50; // Base score

    // Reliability factor: ratio of successes (with variant weight if specified)
    const total = entry.successCount + entry.failureCount;
    if (total > 0) {
      const successRate = entry.successCount / total;
      score += Math.round(successRate * 30); // Up to +30 pts
    } else {
      score += 20; // Untested gets neutral boost
    }

    // Variant-specific weighting
    const isDub = options.variant === "dub" || options.language === "dub";
    if (isDub) {
      const dubTotal = entry.dubSuccessCount + entry.dubFailureCount;
      if (dubTotal > 0) {
        const dubRate = entry.dubSuccessCount / dubTotal;
        score += Math.round((dubRate - 0.5) * 10);
      }
    } else {
      const subTotal = entry.subSuccessCount + entry.subFailureCount;
      if (subTotal > 0) {
        const subRate = entry.subSuccessCount / subTotal;
        score += Math.round((subRate - 0.5) * 10);
      }
    }

    // Latency factor: faster startup earns more points
    const avg = entry.averageStartupMs;
    if (avg < 1000) score += 20;
    else if (avg < 2000) score += 15;
    else if (avg < 3500) score += 10;
    else score += 5;

    // Language match bonus
    if (options.hasLanguageSupport) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  getHealth(providerId: string): ProviderHealth {
    const entry = this.getOrCreate(providerId);
    const inCooldown = this.isCooldown(providerId);

    return {
      status: inCooldown ? "DEGRADED" : entry.status,
      lastCheck: new Date().toISOString(),
      lastSuccess: entry.lastSuccess,
      lastFailure: entry.lastFailure,
      lastError: entry.lastError,
      totalSuccess: entry.successCount,
      totalFailures: entry.failureCount,
      averageStartupMs: entry.averageStartupMs,
      recentStartupMs: entry.recentStartupMs,
      cooldownUntil: entry.cooldownUntil,
      score: this.calculateScore(providerId),
      variantHealth: {
        subSuccess: entry.subSuccessCount,
        subFailures: entry.subFailureCount,
        dubSuccess: entry.dubSuccessCount,
        dubFailures: entry.dubFailureCount,
      },
    };
  }

  getAllHealth(): Record<string, ProviderHealth> {
    const result: Record<string, ProviderHealth> = {};
    for (const [id] of this.healthMap) {
      result[id] = this.getHealth(id);
    }
    return result;
  }

  resetHealth(providerId?: string): void {
    if (providerId) {
      this.healthMap.delete(providerId);
    } else {
      this.healthMap.clear();
    }
  }
}

export const providerHealthCache = new ProviderHealthCache();
