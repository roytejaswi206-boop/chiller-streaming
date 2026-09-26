/**
 * CHILLER INTELLIGENT CDN ROUTER & DELIVERY ORCHESTRATOR
 * Core entry point for media delivery acceleration across Movies, TV, Anime, and VOD.
 * Evaluates node health, regional proximity, circuit breaker status, and origin shield.
 */

import {
  CdnNodeConfig,
  CdnRegion,
  MediaDeliveryResolution,
  CdnOperationalSnapshot,
} from "./cdn-types";
import { getCdnGlobalConfig, getRegisteredCdnNodes } from "./cdn-config";
import { cdnHealth } from "./cdn-health";
import { CdnCacheEngine } from "./cdn-cache";
import { CdnUrlEngine } from "./cdn-url";
import { cdnMetrics } from "./cdn-metrics";

export interface ResolveDeliveryOptions {
  mediaId: string | number;
  mediaType: "movie" | "tv" | "anime" | "video";
  rawMasterUrl?: string;
  clientIp?: string;
  userRegion?: CdnRegion;
  version?: string;
  forceCdnId?: string;
}

export class CdnRouter {
  private static instance: CdnRouter;

  private constructor() {}

  public static getInstance(): CdnRouter {
    if (!CdnRouter.instance) {
      CdnRouter.instance = new CdnRouter();
    }
    return CdnRouter.instance;
  }

  /**
   * Select best healthy CDN node based on health status, region, priority, and weight
   */
  public getHealthyCdn(userRegion: CdnRegion = "GLOBAL", excludedCdnIds: string[] = []): CdnNodeConfig {
    const nodes = getRegisteredCdnNodes().filter((n) => n.isEnabled && n.isConfigured && !excludedCdnIds.includes(n.id));

    if (nodes.length === 0) {
      // Fallback to primary definition (marked isConfigured: false)
      return getRegisteredCdnNodes()[0];
    }

    // Score nodes based on circuit breaker status, region match, and priority
    const scored = nodes.map((node) => {
      const metric = cdnHealth.getMetrics(node.id);
      let score = 100 - (node.priority * 15);

      // Penalize degraded nodes
      if (metric.status === "DEGRADED") score -= 35;
      if (metric.status === "COOLDOWN" || metric.status === "UNHEALTHY" || metric.status === "UNCONFIGURED") score -= 90;

      // Reward region match
      if (userRegion !== "GLOBAL" && (node.region === userRegion || (userRegion === "IN" && node.region === "ASIA"))) {
        score += 25;
      }

      // Latency bonus/penalty
      if (metric.latencyMs > 0) {
        score -= Math.min(30, Math.round(metric.latencyMs / 10));
      }

      return { node, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].node;
  }

  /**
   * Primary Delivery Resolution method:
   * Maps an authorized media asset to the optimal CDN edge endpoint with signed token and cache headers.
   */
  public resolveMediaDelivery(options: ResolveDeliveryOptions): MediaDeliveryResolution {
    const config = getCdnGlobalConfig();
    const userRegion = options.userRegion || "GLOBAL";

    // 1. Select optimal primary CDN and backup nodes
    const primaryCdn = options.forceCdnId
      ? getRegisteredCdnNodes().find((n) => n.id === options.forceCdnId) || this.getHealthyCdn(userRegion)
      : this.getHealthyCdn(userRegion);

    const backupNodes = getRegisteredCdnNodes().filter(
      (n) => n.id !== primaryCdn.id && n.isEnabled && n.isConfigured && cdnHealth.getMetrics(n.id).status !== "COOLDOWN"
    );

    // 2. Generate signed token if configured
    let signedToken: string | undefined;
    let expiresAt: number | undefined;
    if (config.signedUrlsEnabled) {
      signedToken = CdnUrlEngine.generateSignedToken(options.mediaId, options.clientIp || "0.0.0.0");
      expiresAt = Math.floor(Date.now() / 1000) + 7200;
    }

    // 3. Construct master manifest URL & backup URLs (only if a real CDN endpoint is configured)
    let masterUrl = options.rawMasterUrl || "";
    let backupUrls: string[] = [];

    if (primaryCdn.isConfigured && primaryCdn.baseUrl) {
      masterUrl = CdnUrlEngine.buildManifestUrl(primaryCdn, options.mediaId, options.version || "v1", signedToken);
      backupUrls = backupNodes.map((backupNode) =>
        CdnUrlEngine.buildManifestUrl(backupNode, options.mediaId, options.version || "v1", signedToken)
      );
    }

    // 4. Generate RFC-compliant caching headers
    const cacheHeaders = CdnCacheEngine.getCacheHeaders("MASTER_MANIFEST");

    // 5. Record telemetry if configured
    if (primaryCdn.isConfigured) {
      cdnMetrics.recordRequest(primaryCdn.id, "MASTER_MANIFEST", cdnHealth.getMetrics(primaryCdn.id).latencyMs, true);
    }

    return {
      mediaId: options.mediaId,
      mediaType: options.mediaType,
      masterUrl,
      backupUrls,
      cdnId: primaryCdn.isConfigured ? primaryCdn.id : "unconfigured",
      cdnName: primaryCdn.isConfigured ? primaryCdn.name : "Direct Origin / Playback Provider (No CDN Configured)",
      region: primaryCdn.region,
      shieldEnabled: config.originShieldEnabled && primaryCdn.supportsOriginShield && primaryCdn.isConfigured,
      signedToken,
      expiresAt,
      cacheHeaders,
      isImmutable: false, // Manifests revalidate; segments are immutable
    };
  }

  /**
   * Helper to get individual segment URL on active or specific CDN
   */
  public getSegmentUrl(
    mediaId: string | number,
    segmentName: string,
    cdnId?: string,
    version = "v1"
  ): string {
    const cdn = cdnId
      ? getRegisteredCdnNodes().find((n) => n.id === cdnId) || this.getHealthyCdn()
      : this.getHealthyCdn();

    return CdnUrlEngine.buildSegmentUrl(cdn, mediaId, segmentName, version);
  }

  /**
   * Helper to get subtitle URL
   */
  public getSubtitleUrl(mediaId: string | number, lang: string, cdnId?: string): string {
    const cdn = cdnId
      ? getRegisteredCdnNodes().find((n) => n.id === cdnId) || this.getHealthyCdn()
      : this.getHealthyCdn();

    return CdnUrlEngine.buildSubtitleUrl(cdn, mediaId, lang);
  }

  /**
   * Report CDN error (e.g. timeout, 5xx, or network failure)
   */
  public reportCdnFailure(cdnId: string, reason: string) {
    cdnHealth.reportFailure(cdnId, reason);
  }

  /**
   * Report CDN success (resets error count, records latency)
   */
  public reportCdnSuccess(cdnId: string, latencyMs?: number) {
    cdnHealth.reportSuccess(cdnId, latencyMs);
  }

  /**
   * Record a failover occurrence (called by the player when mid-playback failover occurs)
   */
  public handleMidPlaybackFailover(
    failedCdnId: string,
    playbackPositionSeconds: number,
    reason: string,
    mediaId?: string | number
  ): { nextCdn: CdnNodeConfig; resumePosition: number } {
    this.reportCdnFailure(failedCdnId, reason);
    const nextCdn = this.getHealthyCdn("GLOBAL", [failedCdnId]);

    cdnMetrics.recordFailover({
      failedCdnId,
      newCdnId: nextCdn.id,
      playbackPositionSeconds,
      reason,
      success: true,
      mediaId,
      timestamp: Date.now(),
    });

    return {
      nextCdn,
      resumePosition: playbackPositionSeconds,
    };
  }

  /**
   * Operational snapshot for telemetry and admin monitoring
   */
  public getOperationalSnapshot(): CdnOperationalSnapshot {
    const config = getCdnGlobalConfig();
    const nodes = getRegisteredCdnNodes();
    const summary = cdnMetrics.getSummary();

    const cdns = nodes.map((node) => ({
      config: node,
      health: cdnHealth.getMetrics(node.id),
    }));

    return {
      timestamp: Date.now(),
      routerEnabled: config.routerEnabled,
      activeCdnCount: cdns.filter((c) => c.config.isConfigured && c.health.status === "HEALTHY").length,
      cdns,
      recentFailovers: summary.recentFailovers,
      globalMetrics: {
        totalDeliveryRequests: summary.totalDeliveryRequests,
        cacheHitRatio: summary.cacheHitRatio,
        avgLatencyMs: summary.avgLatencyMs,
        failoverCount: summary.failoverCount,
        shieldPassCount: summary.shieldPassCount,
      },
    };
  }
}

export const cdnRouter = CdnRouter.getInstance();
