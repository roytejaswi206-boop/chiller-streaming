/**
 * CHILLER CDN CONFIGURATION MANAGER
 * Loads environment variables, sets defaults, and provides active CDN node definitions.
 */

import { CdnNodeConfig, CdnRegion } from "./cdn-types";

export interface CdnGlobalConfig {
  routerEnabled: boolean;
  healthcheckEnabled: boolean;
  failoverEnabled: boolean;
  signedUrlsEnabled: boolean;
  originShieldEnabled: boolean;
  defaultTtl: number;
  segmentTtl: number;
  manifestTtl: number;
  subtitleTtl: number;
  signingSecret: string;
}

export function getCdnGlobalConfig(): CdnGlobalConfig {
  return {
    routerEnabled: process.env.CDN_ROUTER_ENABLED !== "false",
    healthcheckEnabled: process.env.CDN_HEALTHCHECK_ENABLED !== "false",
    failoverEnabled: process.env.CDN_FAILOVER_ENABLED !== "false",
    signedUrlsEnabled: process.env.CDN_SIGNED_URL_ENABLED === "true",
    originShieldEnabled: process.env.CDN_ORIGIN_SHIELD_ENABLED !== "false",
    defaultTtl: parseInt(process.env.CDN_DEFAULT_TTL || "86400", 10),
    segmentTtl: parseInt(process.env.CDN_SEGMENT_TTL || "31536000", 10), // 1 year immutable
    manifestTtl: parseInt(process.env.CDN_MANIFEST_TTL || "60", 10),     // 60s revalidation
    subtitleTtl: parseInt(process.env.CDN_SUBTITLE_TTL || "86400", 10),  // 24h
    signingSecret: process.env.CDN_SIGNING_SECRET || process.env.STREAMING_SIGNING_SECRET || "chiller_cdn_production_secret_key_8892",
  };
}

/**
 * Default CDN edge topology:
 * CDN-1: Primary Low-Latency Edge (High speed, Origin Shield enabled, optimized for Asia/India & Global)
 * CDN-2: Secondary Global Edge (Cloudflare/Fastly/Akamai compatible edge routing)
 * CDN-3: Tertiary Failover Edge (High availability fallback pool)
 */
export function getRegisteredCdnNodes(): CdnNodeConfig[] {
  const primaryBase = process.env.CDN_PRIMARY_BASE_URL || process.env.NEXT_PUBLIC_CDN_BASE_URL || "";
  const secondaryBase = process.env.CDN_SECONDARY_BASE_URL || "";
  const tertiaryBase = process.env.CDN_TERTIARY_BASE_URL || "";

  const isPrimaryConfigured = Boolean(primaryBase && primaryBase.trim() !== "");
  const isSecondaryConfigured = Boolean(secondaryBase && secondaryBase.trim() !== "");
  const isTertiaryConfigured = Boolean(tertiaryBase && tertiaryBase.trim() !== "");

  const nodes: CdnNodeConfig[] = [
    {
      id: "cdn-primary",
      name: "Chiller Edge Turbo (Primary)",
      baseUrl: primaryBase,
      region: (process.env.CDN_PRIMARY_REGION as CdnRegion) || "GLOBAL",
      priority: 1,
      weight: 100,
      isEnabled: process.env.CDN_PRIMARY_ENABLED !== "false" && isPrimaryConfigured,
      isConfigured: isPrimaryConfigured,
      supportsHls: true,
      supportsByteRange: true,
      supportsHttp3: true,
      supportsOriginShield: true,
      supportsSignedUrls: true,
    },
    {
      id: "cdn-secondary",
      name: "Chiller Edge Shield (Secondary)",
      baseUrl: secondaryBase,
      region: (process.env.CDN_SECONDARY_REGION as CdnRegion) || "ASIA",
      priority: 2,
      weight: 80,
      isEnabled: process.env.CDN_SECONDARY_ENABLED !== "false" && isSecondaryConfigured,
      isConfigured: isSecondaryConfigured,
      supportsHls: true,
      supportsByteRange: true,
      supportsHttp3: true,
      supportsOriginShield: true,
      supportsSignedUrls: true,
    },
    {
      id: "cdn-tertiary",
      name: "Chiller Resilient Backup (Tertiary)",
      baseUrl: tertiaryBase,
      region: (process.env.CDN_TERTIARY_REGION as CdnRegion) || "GLOBAL",
      priority: 3,
      weight: 50,
      isEnabled: (process.env.CDN_TERTIARY_ENABLED === "true") && isTertiaryConfigured,
      isConfigured: isTertiaryConfigured,
      supportsHls: true,
      supportsByteRange: true,
      supportsHttp3: false,
      supportsOriginShield: false,
      supportsSignedUrls: true,
    },
  ];

  return nodes;
}
