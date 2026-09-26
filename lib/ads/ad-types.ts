/**
 * lib/ads/ad-types.ts
 *
 * CHILLER — Centralized Ad System Type Definitions
 */

export type AdPlacement =
  // Home placements
  | "home_top"
  | "home_mid"
  | "home_discovery"
  | "home_bottom"
  // Movies placements
  | "movies_top"
  | "movies_mid"
  | "movies_bottom"
  // Series placements
  | "series_top"
  | "series_mid"
  | "series_bottom"
  // Anime placements
  | "anime_top"
  | "anime_mid"
  | "anime_bottom"
  // Trending placements
  | "trending_mid"
  | "trending_bottom"
  // Genre placements
  | "genre_mid"
  | "genre_bottom"
  // Search placements
  | "search_mid"
  | "search_bottom"
  // Detail page placements
  | "detail_mid"
  | "detail_similar"
  | "detail_bottom"
  // Watch / Player placement
  | "player_below"
  // Legacy aliases
  | "home_content"
  | "browse_content";

export type AdProviderId =
  | "profitablerate_cpm"
  | "profitablerate_invoke"
  | "highrevenue_320x50"
  | "highrevenue_728x90";

export interface AdSettingsData {
  id: string;
  adsEnabled: boolean;
  desktopEnabled: boolean;
  mobileEnabled: boolean;
  homeEnabled: boolean;
  movieEnabled: boolean;
  seriesEnabled: boolean;
  animeEnabled: boolean;
  detailEnabled: boolean;
  watchEnabled: boolean;
  topBannerEnabled: boolean;
  contentBannerEnabled: boolean;
  detailBannerEnabled: boolean;
  playerBannerEnabled: boolean;
  providerProfitableRate: boolean;
  providerHighRevenue320: boolean;
  providerHighRevenue728: boolean;
  initialPageAdDelay: number; // in seconds (default: 12)
  minIntervalSeconds: number; // in seconds (default: 120)
  sessionLimit: number; // default: 5
  pageLimit: number; // default: 2
  playerPageLimit: number; // default: 1
  contentSpacing: number; // items between ads (default: 30)
  updatedAt: string | Date;
}

export interface AdSessionState {
  sessionStartedAt: number;
  lastShownAt: number;
  sessionImpressions: number;
  pageImpressions: number;
  currentPage: string;
  dismissedPlacements: Record<string, number>; // placement -> timestamp
}

export type AdConsentStatus = "granted" | "denied" | "unknown";

export interface AdEligibilityResult {
  eligible: boolean;
  reason: string;
  provider?: AdProviderId;
  format?: "728x90" | "320x50" | "native" | "invoke";
}

export interface AdImpressionPayload {
  provider: string;
  placement: string;
  page: string;
  deviceType: "desktop" | "mobile" | "tablet";
  status: "success" | "failed" | "dismissed";
}
