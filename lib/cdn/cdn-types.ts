/**
 * CHILLER CDN DELIVERY ARCHITECTURE - TYPE DEFINITIONS
 * Provider-agnostic definitions for Edge Delivery, Multi-CDN Routing,
 * Circuit Breaker, Health Tracking, and HLS Optimization.
 */

export type CdnRegion = "GLOBAL" | "IN" | "ASIA" | "EU" | "US";

export type CdnHealthState = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "COOLDOWN";

export type CdnAssetType =
  | "MASTER_MANIFEST"
  | "VARIANT_MANIFEST"
  | "VOD_SEGMENT"
  | "VOD_AUDIO"
  | "SUBTITLE"
  | "POSTER"
  | "BACKDROP";

export interface CdnNodeConfig {
  id: string;
  name: string;
  baseUrl: string;
  region: CdnRegion;
  priority: number; // 1 = highest
  weight: number;   // 1 - 100 for weighted round-robin among equal priorities
  isEnabled: boolean;
  supportsHls: boolean;
  supportsByteRange: boolean;
  supportsHttp3: boolean;
  supportsOriginShield: boolean;
  supportsSignedUrls: boolean;
}

export interface CdnHealthMetrics {
  cdnId: string;
  status: CdnHealthState;
  latencyMs: number;
  lastChecked: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureAt: number | null;
  lastRecoveryAt: number | null;
  failureReason: string | null;
  cooldownUntil: number | null;
  totalRequests: number;
  totalErrors: number;
  errorRate: number; // 0.0 - 1.0
}

export interface CdnRoutingDecision {
  selectedCdn: CdnNodeConfig;
  backupCdns: CdnNodeConfig[];
  userRegion: CdnRegion;
  routingReason: string;
  isFailover: boolean;
  timestamp: number;
}

export interface MediaDeliveryResolution {
  mediaId: string | number;
  mediaType: "movie" | "tv" | "anime" | "video";
  masterUrl: string;
  backupUrls: string[];
  cdnId: string;
  cdnName: string;
  region: CdnRegion;
  shieldEnabled: boolean;
  signedToken?: string;
  expiresAt?: number;
  cacheHeaders: Record<string, string>;
  isImmutable: boolean;
}

export interface CdnFailoverEvent {
  id: string;
  timestamp: number;
  mediaId?: string | number;
  failedCdnId: string;
  newCdnId: string;
  playbackPositionSeconds: number;
  reason: string;
  success: boolean;
}

export interface CdnOperationalSnapshot {
  timestamp: number;
  routerEnabled: boolean;
  activeCdnCount: number;
  cdns: {
    config: CdnNodeConfig;
    health: CdnHealthMetrics;
  }[];
  recentFailovers: CdnFailoverEvent[];
  globalMetrics: {
    totalDeliveryRequests: number;
    cacheHitRatio: number;
    avgLatencyMs: number;
    failoverCount: number;
    shieldPassCount: number;
  };
}
