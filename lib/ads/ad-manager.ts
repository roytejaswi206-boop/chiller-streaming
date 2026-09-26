/**
 * lib/ads/ad-manager.ts
 *
 * CHILLER — Centralized Ad Manager & Orchestration Engine
 *
 * Enforces:
 * - Master Kill Switch check (adsEnabled)
 * - Device, page, and placement switches
 * - Account-level ad-free exemption
 * - Super admin auto-exemption
 * - Fullscreen & route exclusions
 * - Throttling & frequency caps
 * - Responsive provider selection (728x90 vs 320x50)
 * - Provider circuit-breaker cooldown
 * - Non-blocking impression analytics
 */

import {
  AdPlacement,
  AdSettingsData,
  AdEligibilityResult,
  AdImpressionPayload,
  AdProviderId,
} from "./ad-types";
import { AD_PROVIDERS, DEFAULT_AD_SETTINGS } from "./config";
import { isUserAdsFree, isRouteExcluded, isFullscreenActive, getAdsConsentStatus, UserContextForAds } from "./ad-exclusions";
import { checkFrequencyEligibility } from "./ad-frequency";

// In-memory provider circuit-breaker tracking
const providerFailures = new Map<string, { count: number; cooldownUntil: number }>();
const FAILURE_THRESHOLD = 2;
const FAILURE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Record a provider runtime failure (circuit breaker)
 */
export function recordProviderFailure(providerId: string): void {
  const current = providerFailures.get(providerId) || { count: 0, cooldownUntil: 0 };
  const newCount = current.count + 1;
  const cooldownUntil = newCount >= FAILURE_THRESHOLD ? Date.now() + FAILURE_COOLDOWN_MS : 0;
  providerFailures.set(providerId, { count: newCount, cooldownUntil });
}

/**
 * Check if a provider is currently blocked by circuit-breaker
 */
export function isProviderAvailable(providerId: string): boolean {
  const status = providerFailures.get(providerId);
  if (!status) return true;
  if (status.cooldownUntil && Date.now() < status.cooldownUntil) {
    return false;
  }
  return true;
}

/**
 * Master evaluation for ad slot eligibility
 */
export function evaluateAdEligibility(
  placement: AdPlacement,
  pathname: string,
  user: UserContextForAds | null | undefined,
  isMobile: boolean,
  settings: AdSettingsData = DEFAULT_AD_SETTINGS,
  formatPreference?: "responsive" | "native" | "banner"
): AdEligibilityResult {
  // 1. Global Kill Switch Check
  if (!settings.adsEnabled) {
    return { eligible: false, reason: "Global ads switch is disabled" };
  }

  // 2. Device Switches
  if (isMobile && !settings.mobileEnabled) {
    return { eligible: false, reason: "Mobile ads disabled" };
  }
  if (!isMobile && !settings.desktopEnabled) {
    return { eligible: false, reason: "Desktop ads disabled" };
  }

  // 3. User Ad-Free Exemption (Super Admin / adsFree: true / Premium)
  if (isUserAdsFree(user)) {
    return { eligible: false, reason: "User has Ad-Free status" };
  }

  // 4. Route Exclusions (admin, auth, profile, etc.)
  if (isRouteExcluded(pathname)) {
    return { eligible: false, reason: "Route is ad-exempt" };
  }

  // 5. Fullscreen Guard (Never show ads when watching in fullscreen)
  if (isFullscreenActive()) {
    return { eligible: false, reason: "Fullscreen active" };
  }

  // 6. Privacy Consent
  if (getAdsConsentStatus() === "denied") {
    return { eligible: false, reason: "User declined advertising consent" };
  }

  // 7. Page-Specific Switches
  if (pathname === "/" && !settings.homeEnabled) {
    return { eligible: false, reason: "Home ads disabled" };
  }
  if (pathname.startsWith("/movies") && !settings.movieEnabled) {
    return { eligible: false, reason: "Movie page ads disabled" };
  }
  if (pathname.startsWith("/series") && !settings.seriesEnabled) {
    return { eligible: false, reason: "Series page ads disabled" };
  }
  if (pathname.startsWith("/anime") && !settings.animeEnabled) {
    return { eligible: false, reason: "Anime page ads disabled" };
  }
  if (pathname.startsWith("/watch") && !settings.watchEnabled) {
    return { eligible: false, reason: "Watch page ads disabled" };
  }
  if ((pathname.startsWith("/movie/") || pathname.startsWith("/tv/")) && !settings.detailEnabled) {
    return { eligible: false, reason: "Detail page ads disabled" };
  }

  // 8. Placement-Specific Switches
  const isTop = placement === "home_top" || placement.endsWith("_top");
  const isContent =
    placement === "home_content" ||
    placement === "browse_content" ||
    placement.endsWith("_mid") ||
    placement.endsWith("_discovery");
  const isDetailOrBottom =
    placement === "detail_bottom" ||
    placement.startsWith("detail_") ||
    placement.endsWith("_bottom");
  const isPlayer = placement === "player_below";

  if (isTop && !settings.topBannerEnabled) {
    return { eligible: false, reason: "Top banner placement disabled" };
  }
  if (isContent && !settings.contentBannerEnabled) {
    return { eligible: false, reason: "Content banner placement disabled" };
  }
  if (isDetailOrBottom && !settings.detailBannerEnabled) {
    return { eligible: false, reason: "Detail/bottom banner placement disabled" };
  }
  if (isPlayer && !settings.playerBannerEnabled) {
    return { eligible: false, reason: "Player below placement disabled" };
  }

  // 9. Frequency & Throttling Limits
  const freqCheck = checkFrequencyEligibility(placement, pathname, settings);
  if (!freqCheck.allowed) {
    return { eligible: false, reason: freqCheck.reason };
  }

  // 10. Provider Selection & Circuit Breaker Check
  let selectedProvider: AdProviderId;
  let selectedFormat: "728x90" | "320x50" | "invoke" | "native";

  // Check if Native Banner is preferred for this slot
  const preferNative =
    formatPreference === "native" ||
    placement.endsWith("_bottom") ||
    placement.includes("discovery");

  if (preferNative && settings.providerProfitableRate && isProviderAvailable(AD_PROVIDERS.PROFITABLERATE_INVOKE.id)) {
    selectedProvider = "profitablerate_invoke";
    selectedFormat = "native";
  } else if (isMobile) {
    // Mobile banner preference (320x50)
    if (settings.providerHighRevenue320 && isProviderAvailable(AD_PROVIDERS.HIGHREVENUE_320x50.id)) {
      selectedProvider = "highrevenue_320x50";
      selectedFormat = "320x50";
    } else if (settings.providerProfitableRate && isProviderAvailable(AD_PROVIDERS.PROFITABLERATE_INVOKE.id)) {
      selectedProvider = "profitablerate_invoke";
      selectedFormat = "invoke";
    } else {
      return { eligible: false, reason: "All mobile providers in cooldown" };
    }
  } else {
    // Desktop leaderboard preference (728x90)
    if (settings.providerHighRevenue728 && isProviderAvailable(AD_PROVIDERS.HIGHREVENUE_728x90.id)) {
      selectedProvider = "highrevenue_728x90";
      selectedFormat = "728x90";
    } else if (settings.providerProfitableRate && isProviderAvailable(AD_PROVIDERS.PROFITABLERATE_INVOKE.id)) {
      selectedProvider = "profitablerate_invoke";
      selectedFormat = "invoke";
    } else {
      return { eligible: false, reason: "All desktop providers in cooldown" };
    }
  }

  return {
    eligible: true,
    reason: "Eligible for display",
    provider: selectedProvider,
    format: selectedFormat,
  };
}

/**
 * Report impression or failure asynchronously without blocking the UI
 */
export function logAdImpression(payload: AdImpressionPayload): void {
  if (typeof window === "undefined") return;

  try {
    const data = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/ads/impression", data);
    } else {
      fetch("/api/ads/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Non-blocking
  }
}
