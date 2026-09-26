/**
 * CHILLER CDN HEALTH MONITOR & CIRCUIT BREAKER
 * Tracks live node availability, latencies, rolling error rates,
 * and handles automatic failover and recovery cooldowns.
 */

import { CdnHealthMetrics, CdnHealthState, CdnNodeConfig } from "./cdn-types";
import { getRegisteredCdnNodes } from "./cdn-config";

const FAILURE_THRESHOLD_DEGRADE = 3;  // 3 consecutive failures -> DEGRADED
const FAILURE_THRESHOLD_COOLDOWN = 5; // 5 consecutive failures -> COOLDOWN
const COOLDOWN_DURATION_MS = 60000;   // 1 minute cooldown before re-testing
const LATENCY_ROLLING_FACTOR = 0.3;   // Exponential moving average for ping response time

class CdnHealthRegistry {
  private static instance: CdnHealthRegistry;
  private metrics: Map<string, CdnHealthMetrics> = new Map();

  private constructor() {
    this.initMetrics();
  }

  public static getInstance(): CdnHealthRegistry {
    if (!CdnHealthRegistry.instance) {
      CdnHealthRegistry.instance = new CdnHealthRegistry();
    }
    return CdnHealthRegistry.instance;
  }

  private initMetrics() {
    const nodes = getRegisteredCdnNodes();
    for (const node of nodes) {
      if (!this.metrics.has(node.id)) {
        const isConfigured = Boolean(node.baseUrl && node.baseUrl.trim() !== "");
        this.metrics.set(node.id, {
          cdnId: node.id,
          status: isConfigured ? "HEALTHY" : "UNCONFIGURED",
          latencyMs: 0,
          lastChecked: Date.now(),
          consecutiveFailures: isConfigured ? 0 : 1,
          consecutiveSuccesses: isConfigured ? 10 : 0,
          lastFailureAt: isConfigured ? null : Date.now(),
          lastRecoveryAt: isConfigured ? Date.now() : null,
          failureReason: isConfigured ? null : "Endpoint URL not configured in environment",
          cooldownUntil: null,
          totalRequests: 0,
          totalErrors: 0,
          errorRate: 0,
        });
      }
    }
  }

  public getMetrics(cdnId: string): CdnHealthMetrics {
    this.initMetrics();
    const metric = this.metrics.get(cdnId);
    if (!metric) {
      return {
        cdnId,
        status: "HEALTHY",
        latencyMs: 50,
        lastChecked: Date.now(),
        consecutiveFailures: 0,
        consecutiveSuccesses: 5,
        lastFailureAt: null,
        lastRecoveryAt: Date.now(),
        failureReason: null,
        cooldownUntil: null,
        totalRequests: 0,
        totalErrors: 0,
        errorRate: 0,
      };
    }

    // Auto-recover from cooldown if timeout elapsed
    if (metric.status === "COOLDOWN" && metric.cooldownUntil && Date.now() > metric.cooldownUntil) {
      metric.status = "DEGRADED"; // Transition to half-open
      metric.consecutiveFailures = 2;
    }

    return metric;
  }

  public getAllMetrics(): CdnHealthMetrics[] {
    this.initMetrics();
    const list: CdnHealthMetrics[] = [];
    for (const id of this.metrics.keys()) {
      list.push(this.getMetrics(id));
    }
    return list;
  }

  public reportSuccess(cdnId: string, measuredLatencyMs?: number) {
    const m = this.getMetrics(cdnId);
    m.lastChecked = Date.now();
    m.totalRequests += 1;
    m.consecutiveSuccesses += 1;
    m.consecutiveFailures = 0;

    if (measuredLatencyMs && measuredLatencyMs > 0) {
      m.latencyMs = Math.round(
        m.latencyMs * (1 - LATENCY_ROLLING_FACTOR) + measuredLatencyMs * LATENCY_ROLLING_FACTOR
      );
    }

    // Recover if was degraded or in cooldown
    if (m.status !== "HEALTHY" && m.consecutiveSuccesses >= 3) {
      m.status = "HEALTHY";
      m.lastRecoveryAt = Date.now();
      m.failureReason = null;
      m.cooldownUntil = null;
    }

    m.errorRate = m.totalRequests > 0 ? Number((m.totalErrors / m.totalRequests).toFixed(3)) : 0;
  }

  public reportFailure(cdnId: string, reason: string) {
    const m = this.getMetrics(cdnId);
    m.lastChecked = Date.now();
    m.lastFailureAt = Date.now();
    m.failureReason = reason;
    m.totalRequests += 1;
    m.totalErrors += 1;
    m.consecutiveFailures += 1;
    m.consecutiveSuccesses = 0;

    if (m.consecutiveFailures >= FAILURE_THRESHOLD_COOLDOWN) {
      m.status = "COOLDOWN";
      m.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
    } else if (m.consecutiveFailures >= FAILURE_THRESHOLD_DEGRADE) {
      m.status = "DEGRADED";
    }

    m.errorRate = m.totalRequests > 0 ? Number((m.totalErrors / m.totalRequests).toFixed(3)) : 1;
  }

  public forceSetStatus(cdnId: string, status: CdnHealthState, reason?: string) {
    const m = this.getMetrics(cdnId);
    m.status = status;
    m.lastChecked = Date.now();
    if (status === "COOLDOWN") {
      m.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
      m.consecutiveFailures = 5;
      m.failureReason = reason || "Manually triggered failure simulation";
    } else if (status === "HEALTHY") {
      m.consecutiveFailures = 0;
      m.consecutiveSuccesses = 5;
      m.cooldownUntil = null;
      m.failureReason = null;
      m.lastRecoveryAt = Date.now();
    }
  }

  public resetAll() {
    this.metrics.clear();
    this.initMetrics();
  }

  /**
   * Probe CDN endpoint reachability
   */
  public async probeNode(node: CdnNodeConfig): Promise<{ reachable: boolean; latencyMs: number; statusText: string }> {
    const start = Date.now();
    if (!node.baseUrl || node.baseUrl.trim() === "") {
      const reason = "UNCONFIGURED (Base URL not set in environment)";
      this.reportFailure(node.id, reason);
      const m = this.getMetrics(node.id);
      m.status = "UNCONFIGURED";
      m.latencyMs = 0;
      return { reachable: false, latencyMs: 0, statusText: reason };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(node.baseUrl, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "Range": "bytes=0-1024",
          "User-Agent": "Chiller-CDN-HealthProbe/1.0",
        },
      });
      clearTimeout(timeoutId);

      const elapsed = Date.now() - start;
      if (res.ok || res.status === 206 || res.status === 301 || res.status === 302 || res.status === 403 || res.status === 404) {
        this.reportSuccess(node.id, elapsed);
        return { reachable: true, latencyMs: elapsed, statusText: `HTTP_${res.status}` };
      }

      this.reportFailure(node.id, `HTTP_${res.status}`);
      return { reachable: false, latencyMs: elapsed, statusText: `HTTP_${res.status}` };
    } catch (err: any) {
      const elapsed = Date.now() - start;
      const reason = err.name === "AbortError" ? "TIMEOUT_3500MS" : err.message || "NETWORK_ERROR";
      this.reportFailure(node.id, reason);
      return { reachable: false, latencyMs: elapsed, statusText: reason };
    }
  }
}

export const cdnHealth = CdnHealthRegistry.getInstance();
