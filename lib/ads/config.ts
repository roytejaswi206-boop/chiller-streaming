/**
 * lib/ads/config.ts
 *
 * CHILLER — Centralized Ad System Configuration & Provider Registry
 */

import { prisma } from "@/lib/prisma";
import { AdSettingsData } from "./ad-types";

export const DEFAULT_AD_SETTINGS: AdSettingsData = {
  id: "global",
  adsEnabled: true,
  desktopEnabled: true,
  mobileEnabled: true,
  homeEnabled: true,
  movieEnabled: true,
  seriesEnabled: true,
  animeEnabled: true,
  detailEnabled: true,
  watchEnabled: true,
  topBannerEnabled: true,
  contentBannerEnabled: true,
  detailBannerEnabled: true,
  playerBannerEnabled: true,
  providerProfitableRate: true,
  providerHighRevenue320: true,
  providerHighRevenue728: true,
  initialPageAdDelay: 0,
  minIntervalSeconds: 0,
  sessionLimit: 50,
  pageLimit: 6,
  playerPageLimit: 1,
  contentSpacing: 30,
  updatedAt: new Date(),
};

/**
 * Exact provider snippets provided by site owner:
 *
 * A) Profitableratecpm Network script:
 *    https://pl31522715.profitableratecpmnetwork.com/ca/d9/72/cad9727ff2ff49f5370a1cb10d3c2b07.js
 *
 * B) Profitableratecpm invoke unit:
 *    https://pl31522716.profitableratecpmnetwork.com/036795d0ec9ca91f70d3e5f8d8def3c3/invoke.js
 *    container: container-036795d0ec9ca91f70d3e5f8d8def3c3
 *
 * C) 320x50 unit (mobile):
 *    key: 68c3e3bd8671092fe3359316a995024c
 *    https://www.highrevenueformat.com/68c3e3bd8671092fe3359316a995024c/invoke.js
 *
 * D) 728x90 unit (desktop/tablet):
 *    key: b541512a190670f60deae70ce055bb3e
 *    https://www.highrevenueformat.com/b541512a190670f60deae70ce055bb3e/invoke.js
 */
export const AD_PROVIDERS = {
  PROFITABLERATE_CPM: {
    id: "profitablerate_cpm" as const,
    name: "Profitablerate CPM Network",
    scriptUrl: "https://pl31522715.profitableratecpmnetwork.com/ca/d9/72/cad9727ff2ff49f5370a1cb10d3c2b07.js",
  },
  PROFITABLERATE_INVOKE: {
    id: "profitablerate_invoke" as const,
    name: "Profitablerate Invoke Unit",
    scriptUrl: "https://pl31522716.profitableratecpmnetwork.com/036795d0ec9ca91f70d3e5f8d8def3c3/invoke.js",
    containerId: "container-036795d0ec9ca91f70d3e5f8d8def3c3",
  },
  HIGHREVENUE_320x50: {
    id: "highrevenue_320x50" as const,
    name: "HighRevenueFormat Mobile Banner (320x50)",
    key: "68c3e3bd8671092fe3359316a995024c",
    scriptUrl: "https://www.highrevenueformat.com/68c3e3bd8671092fe3359316a995024c/invoke.js",
    width: 320,
    height: 50,
  },
  HIGHREVENUE_728x90: {
    id: "highrevenue_728x90" as const,
    name: "HighRevenueFormat Leaderboard (728x90)",
    key: "b541512a190670f60deae70ce055bb3e",
    scriptUrl: "https://www.highrevenueformat.com/b541512a190670f60deae70ce055bb3e/invoke.js",
    width: 728,
    height: 90,
  },
};

// In-memory cache for ad settings (TTL: 60 seconds)
let cachedSettings: AdSettingsData | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Fetch ad settings from database with resilient fallback to defaults
 */
export async function getAdSettings(): Promise<AdSettingsData> {
  const now = Date.now();
  if (cachedSettings && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSettings;
  }

  // Check for environment variable overrides
  const envDisabled = process.env.ADS_ENABLED === "false" || process.env.NEXT_PUBLIC_ADS_ENABLED === "false";

  try {
    const dbRecord = await prisma.adSettings.findUnique({
      where: { id: "global" },
    });

    if (dbRecord) {
      cachedSettings = {
        ...dbRecord,
        adsEnabled: envDisabled ? false : dbRecord.adsEnabled,
      };
      lastCacheTime = now;
      return cachedSettings;
    }

    // Auto-create default settings record if DB is available
    const created = await prisma.adSettings.create({
      data: {
        id: "global",
        adsEnabled: !envDisabled,
      },
    });

    cachedSettings = created;
    lastCacheTime = now;
    return cachedSettings;
  } catch (err) {
    // If DB is offline or table does not exist, return safe defaults
    const fallback: AdSettingsData = {
      ...DEFAULT_AD_SETTINGS,
      adsEnabled: envDisabled ? false : DEFAULT_AD_SETTINGS.adsEnabled,
    };
    cachedSettings = fallback;
    lastCacheTime = now;
    return fallback;
  }
}

/**
 * Updates ad settings in DB and invalidates the local memory cache
 */
export async function updateAdSettings(updates: Partial<AdSettingsData>): Promise<AdSettingsData> {
  const { id, updatedAt, createdAt, ...dataToUpdate } = updates as any;

  try {
    const updated = await prisma.adSettings.upsert({
      where: { id: "global" },
      update: dataToUpdate,
      create: {
        ...DEFAULT_AD_SETTINGS,
        ...dataToUpdate,
        id: "global",
      },
    });
    cachedSettings = updated;
    lastCacheTime = Date.now();
    return updated;
  } catch (err) {
    // In-memory update if DB is read-only
    const fallback: AdSettingsData = {
      ...(cachedSettings || DEFAULT_AD_SETTINGS),
      ...dataToUpdate,
      updatedAt: new Date(),
    };
    cachedSettings = fallback;
    lastCacheTime = Date.now();
    return fallback;
  }
}

/**
 * Invalidate cache immediately (e.g. after admin update)
 */
export function invalidateAdSettingsCache() {
  cachedSettings = null;
  lastCacheTime = 0;
}
