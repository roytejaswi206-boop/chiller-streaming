/**
 * lib/ads/ad-frequency.ts
 *
 * CHILLER — Smart Ad Frequency & Impression Throttling Engine
 *
 * Principles:
 * - Infrequent, respectful monetization.
 * - Initial page delay: User gets to explore before any ad shows.
 * - Minimum interval between ads (default: 120s).
 * - Hard cap on session impressions (default: 5).
 * - Hard cap on page impressions (default: 2, player: 1).
 * - Dismissal memory (15 min cooldown on closed placements).
 */

import { AdSessionState, AdSettingsData, AdPlacement } from "./ad-types";

const SESSION_KEY = "chiller_ad_session";
const DISMISS_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

let pageLoadedTimestamp = Date.now();

/**
 * Reset page load timestamp upon client-side route transitions
 */
export function resetPageLoadTimer(): void {
  pageLoadedTimestamp = Date.now();
}

/**
 * Retrieve or initialize session state
 */
export function getAdSessionState(): AdSessionState {
  if (typeof window === "undefined") {
    return {
      sessionStartedAt: Date.now(),
      lastShownAt: 0,
      sessionImpressions: 0,
      pageImpressions: 0,
      currentPage: "",
      dismissedPlacements: {},
    };
  }

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Reset page impressions if user changed page
      const currentPath = window.location.pathname;
      if (parsed.currentPage !== currentPath) {
        parsed.currentPage = currentPath;
        parsed.pageImpressions = 0;
      }
      return parsed;
    }
  } catch {
    // Non-blocking fallback
  }

  const initial: AdSessionState = {
    sessionStartedAt: Date.now(),
    lastShownAt: 0,
    sessionImpressions: 0,
    pageImpressions: 0,
    currentPage: typeof window !== "undefined" ? window.location.pathname : "",
    dismissedPlacements: {},
  };

  saveAdSessionState(initial);
  return initial;
}

/**
 * Persist updated session state
 */
export function saveAdSessionState(state: AdSessionState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // Non-blocking
  }
}

/**
 * Evaluates whether an ad is permitted by the frequency engine
 */
export function checkFrequencyEligibility(
  placement: AdPlacement,
  pathname: string,
  settings: AdSettingsData
): { allowed: boolean; reason: string } {
  if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
    return { allowed: false, reason: "Server rendering" };
  }

  const now = Date.now();
  const session = getAdSessionState();

  // 1. Initial Page Ad Delay Check (default 12s)
  const elapsedSincePageLoad = (now - pageLoadedTimestamp) / 1000;
  if (elapsedSincePageLoad < settings.initialPageAdDelay) {
    return {
      allowed: false,
      reason: `Initial page delay active (${Math.ceil(settings.initialPageAdDelay - elapsedSincePageLoad)}s remaining)`,
    };
  }

  // 2. Dismissal Cooldown Check
  const dismissedTime = session.dismissedPlacements[placement];
  if (dismissedTime && now - dismissedTime < DISMISS_COOLDOWN_MS) {
    const remainingMins = Math.ceil((DISMISS_COOLDOWN_MS - (now - dismissedTime)) / 60000);
    return {
      allowed: false,
      reason: `Placement dismissed recently (${remainingMins}m cooldown remaining)`,
    };
  }

  // 3. Session Maximum Check (default 5)
  if (session.sessionImpressions >= settings.sessionLimit) {
    return {
      allowed: false,
      reason: `Session impression limit reached (${session.sessionImpressions}/${settings.sessionLimit})`,
    };
  }

  // 4. Page Maximum Check (default 2; watch page is strictly 1)
  const isWatchPage = pathname.startsWith("/watch");
  const maxPageLimit = isWatchPage ? settings.playerPageLimit : settings.pageLimit;
  if (session.pageImpressions >= maxPageLimit) {
    return {
      allowed: false,
      reason: `Page impression limit reached (${session.pageImpressions}/${maxPageLimit})`,
    };
  }

  // 5. Minimum Interval Between Ads Check (default 120s)
  if (session.lastShownAt > 0) {
    const elapsedSinceLastAd = (now - session.lastShownAt) / 1000;
    if (elapsedSinceLastAd < settings.minIntervalSeconds) {
      return {
        allowed: false,
        reason: `Frequency throttling active (${Math.ceil(settings.minIntervalSeconds - elapsedSinceLastAd)}s remaining)`,
      };
    }
  }

  return { allowed: true, reason: "Eligible" };
}

/**
 * Record an ad impression and update session counters
 */
export function recordSessionImpression(placement: AdPlacement): void {
  const session = getAdSessionState();
  session.lastShownAt = Date.now();
  session.sessionImpressions += 1;
  session.pageImpressions += 1;
  saveAdSessionState(session);
}

/**
 * Record a user dismissal of an ad placement
 */
export function recordSessionDismissal(placement: AdPlacement): void {
  const session = getAdSessionState();
  session.dismissedPlacements[placement] = Date.now();
  saveAdSessionState(session);
}
