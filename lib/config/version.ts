/**
 * lib/config/version.ts
 *
 * Single Source of Truth for CHILLER Application Version & Build Identity.
 * Used by client update managers, service worker cache naming, and /api/version.
 */

export const CHILLER_APP_VERSION = "2.1.0";

// Public safe build identity baked into bundle or resolved at runtime
export const CHILLER_BUILD_ID =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_CHILLER_BUILD_ID ||
  "2026.09.25-5f0f0b8";

export const CHILLER_BUILD_TIMESTAMP =
  process.env.NEXT_PUBLIC_BUILD_TIMESTAMP ||
  "2026-09-25T20:50:00Z";

export const CHILLER_CACHE_VERSION = `chiller-${CHILLER_BUILD_ID.slice(0, 12)}`;

export interface ChillerVersionInfo {
  version: string;
  buildId: string;
  buildTimestamp: string;
  cacheVersion: string;
  status: "ok";
}

export function getChillerVersionInfo(): ChillerVersionInfo {
  return {
    version: CHILLER_APP_VERSION,
    buildId: CHILLER_BUILD_ID,
    buildTimestamp: CHILLER_BUILD_TIMESTAMP,
    cacheVersion: CHILLER_CACHE_VERSION,
    status: "ok",
  };
}
