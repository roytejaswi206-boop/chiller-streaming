/**
 * CHILLER CDN METRICS & OPERATIONAL TELEMETRY
 * Aggregates anonymized performance measurements: TTFB, segment latencies,
 * buffering frequency, cache efficiency, and failover events.
 */

import { CdnFailoverEvent } from "./cdn-types";

export interface LatencySample {
  timestamp: number;
  cdnId: string;
  latencyMs: number;
  assetType: string;
}

class CdnMetricsCollector {
  private static instance: CdnMetricsCollector;

  private totalDeliveryRequests = 0;
  private cacheHitCount = 0;
  private originShieldPassCount = 0;
  private recentFailoverEvents: CdnFailoverEvent[] = [];
  private latencySamples: LatencySample[] = [];

  private constructor() {}

  public static getInstance(): CdnMetricsCollector {
    if (!CdnMetricsCollector.instance) {
      CdnMetricsCollector.instance = new CdnMetricsCollector();
    }
    return CdnMetricsCollector.instance;
  }

  public recordRequest(cdnId: string, assetType: string, latencyMs: number, isCacheHit = true) {
    this.totalDeliveryRequests += 1;
    if (isCacheHit) {
      this.cacheHitCount += 1;
    } else {
      this.originShieldPassCount += 1;
    }

    this.latencySamples.push({
      timestamp: Date.now(),
      cdnId,
      latencyMs,
      assetType,
    });

    // Retain only the last 200 samples to keep memory minimal
    if (this.latencySamples.length > 200) {
      this.latencySamples = this.latencySamples.slice(-200);
    }
  }

  public recordFailover(event: Omit<CdnFailoverEvent, "id">): CdnFailoverEvent {
    const fullEvent: CdnFailoverEvent = {
      ...event,
      id: `failover-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };

    this.recentFailoverEvents.unshift(fullEvent);
    if (this.recentFailoverEvents.length > 50) {
      this.recentFailoverEvents = this.recentFailoverEvents.slice(0, 50);
    }

    return fullEvent;
  }

  public getSummary() {
    const total = Math.max(1, this.totalDeliveryRequests);
    const hitRatio = Number((this.cacheHitCount / total).toFixed(3));

    const avgLatency =
      this.latencySamples.length > 0
        ? Math.round(
            this.latencySamples.reduce((sum, s) => sum + s.latencyMs, 0) / this.latencySamples.length
          )
        : 28;

    return {
      totalDeliveryRequests: this.totalDeliveryRequests,
      cacheHitRatio: hitRatio,
      avgLatencyMs: avgLatency,
      failoverCount: this.recentFailoverEvents.length,
      shieldPassCount: this.originShieldPassCount,
      recentFailovers: this.recentFailoverEvents.slice(0, 10),
    };
  }

  public reset() {
    this.totalDeliveryRequests = 0;
    this.cacheHitCount = 0;
    this.originShieldPassCount = 0;
    this.recentFailoverEvents = [];
    this.latencySamples = [];
  }
}

export const cdnMetrics = CdnMetricsCollector.getInstance();
