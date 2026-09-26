/**
 * lib/analytics/config.ts
 *
 * Lightweight configuration constants for CHILLER's basic usage & activity tracking.
 * Safe, non-invasive, anonymous/session-based telemetry.
 */

// Active Users Now threshold (default: 5 minutes)
export const ACTIVE_NOW_THRESHOLD_MS = 5 * 60 * 1000;

// Client-side heartbeat throttle (every 90 seconds while tab is active)
export const CLIENT_HEARTBEAT_INTERVAL_MS = 90 * 1000;

// Deduplication throttle window for content watch sessions (30 minutes)
export const WATCH_SESSION_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

// In-memory cache TTL for Super Admin stats endpoint (10 seconds)
export const STATS_CACHE_TTL_MS = 10 * 1000;
