/**
 * lib/ads/ad-exclusions.ts
 *
 * CHILLER — Centralized Ad Exclusion & Exemption Engine
 *
 * Handles:
 * 1. Account-level ad-free exemptions (user.adsFree === true)
 * 2. Root Super Admin automatic ad-free status
 * 3. Route exclusions (admin, auth, profile, settings)
 * 4. Fullscreen playback isolation (ads must NEVER appear during fullscreen)
 * 5. Privacy consent gate
 */

import { isSuperAdminEmail } from "@/lib/config/super-admin";
import { AdConsentStatus } from "./ad-types";

// Routes where advertisements must never appear under any circumstances
const EXCLUDED_ROUTE_PREFIXES = [
  "/admin",
  "/login",
  "/register",
  "/auth",
  "/profile",
  "/settings",
  "/change-password",
  "/api",
];

export interface UserContextForAds {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  tier?: string | null;
  adsFree?: boolean | null;
}

/**
 * Check if the user is completely exempt from ads.
 * Evaluates:
 * - Super admin identity (strictly 0 ads)
 * - User database field adsFree: true
 * - Premium tier if applicable
 */
export function isUserAdsFree(user?: UserContextForAds | null): boolean {
  if (!user) return false;

  // 1. Authoritative Super Admin check
  if (user.role === "SUPER_ADMIN") return true;
  if (user.email && isSuperAdminEmail(user.email)) return true;

  // 2. Account level ad-free flag
  if (user.adsFree === true) return true;

  // 3. Premium tier accounts
  if (user.tier === "PREMIUM_MONTHLY" || user.tier === "PREMIUM_YEARLY") return true;

  return false;
}

/**
 * Check if the current route is excluded from ads.
 */
export function isRouteExcluded(pathname: string): boolean {
  if (!pathname) return false;
  const normalized = pathname.toLowerCase();
  return EXCLUDED_ROUTE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * Check if browser is currently in fullscreen mode.
 * Advertisements MUST NEVER render or overlap when the user is watching in fullscreen.
 */
export function isFullscreenActive(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
  );
}

/**
 * Check privacy consent status from local storage.
 * Default is 'granted' unless user explicitly opted out.
 */
export function getAdsConsentStatus(): AdConsentStatus {
  if (typeof window === "undefined") return "unknown";
  try {
    const stored = localStorage.getItem("chiller_ads_consent");
    if (stored === "denied") return "denied";
    if (stored === "granted") return "granted";
    return "granted"; // Default permissive if no explicit block
  } catch {
    return "unknown";
  }
}

export function setAdsConsentStatus(status: AdConsentStatus): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("chiller_ads_consent", status);
  } catch {
    // Non-blocking
  }
}
