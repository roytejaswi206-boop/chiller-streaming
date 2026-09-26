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
  providerContainer: true,
  providerSmartlink: true,
  initialPageAdDelay: 0,
  minIntervalSeconds: 0,
  sessionLimit: 50,
  pageLimit: 6,
  playerPageLimit: 1,
  contentSpacing: 30,
  updatedAt: new Date(),
};

/**
 * Exact advertiser-supplied ad snippets (DO NOT MODIFY KEYS, URLS, ATOPTIONS, OR IDS):
 *
 * 1. Smartlink / Script:
 *    URL: https://www.profitableratecpmnetwork.com/ujy49iz7mn?key=9d9f3f1de133e143e575ce2748c53035
 *    Script: https://pl31526795.profitableratecpmnetwork.com/19/c9/9b/19c99b3212a84ec41f398c12acf68fa1.js
 *
 * 2. 728x90 Leaderboard:
 *    Key: b541512a190670f60deae70ce055bb3e
 *    Script: https://www.highrevenueformat.com/b541512a190670f60deae70ce055bb3e/invoke.js
 *
 * 3. 320x50 Mobile Banner:
 *    Key: 68c3e3bd8671092fe3359316a995024c
 *    Script: https://www.highrevenueformat.com/68c3e3bd8671092fe3359316a995024c/invoke.js
 *
 * 4. Container Ad:
 *    Container: container-036795d0ec9ca91f70d3e5f8d8def3c3
 *    Script: https://pl31522716.profitableratecpmnetwork.com/036795d0ec9ca91f70d3e5f8d8def3c3/invoke.js
 *
 * 5. External Network Script:
 *    Script: https://pl31522715.profitableratecpmnetwork.com/ca/d9/72/cad9727ff2ff49f5370a1cb10d3c2b07.js
 */
export const AD_PROVIDERS = {
  // Code 1: Smartlink & Script
  PROFITABLERATE_SMARTLINK: {
    id: "profitablerate_smartlink" as const,
    name: "Profitablerate Smartlink & Script",
    url: "https://www.profitableratecpmnetwork.com/ujy49iz7mn?key=9d9f3f1de133e143e575ce2748c53035",
    scriptUrl: "https://pl31526795.profitableratecpmnetwork.com/19/c9/9b/19c99b3212a84ec41f398c12acf68fa1.js",
  },
  // Code 2: 728x90 Leaderboard
  HIGHREVENUE_728x90: {
    id: "highrevenue_728x90" as const,
    name: "HighRevenueFormat Leaderboard (728x90)",
    key: "b541512a190670f60deae70ce055bb3e",
    scriptUrl: "https://www.highrevenueformat.com/b541512a190670f60deae70ce055bb3e/invoke.js",
    width: 728,
    height: 90,
  },
  // Code 3: 320x50 Mobile Banner
  HIGHREVENUE_320x50: {
    id: "highrevenue_320x50" as const,
    name: "HighRevenueFormat Mobile Banner (320x50)",
    key: "68c3e3bd8671092fe3359316a995024c",
    scriptUrl: "https://www.highrevenueformat.com/68c3e3bd8671092fe3359316a995024c/invoke.js",
    width: 320,
    height: 50,
  },
  // Code 4: Container Ad
  PROFITABLERATE_INVOKE: {
    id: "profitablerate_invoke" as const,
    name: "Profitablerate Invoke Container",
    scriptUrl: "https://pl31522716.profitableratecpmnetwork.com/036795d0ec9ca91f70d3e5f8d8def3c3/invoke.js",
    containerId: "container-036795d0ec9ca91f70d3e5f8d8def3c3",
  },
  // Code 5: External Network Script
  PROFITABLERATE_CPM: {
    id: "profitablerate_cpm" as const,
    name: "Profitablerate External Network Script",
    scriptUrl: "https://pl31522715.profitableratecpmnetwork.com/ca/d9/72/cad9727ff2ff49f5370a1cb10d3c2b07.js",
  },
};

// In-memory cache for ad settings (TTL: 60 seconds)
let cachedSettings: AdSettingsData | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Fetch ad settings from database with resilient fallback to defaults and env switches
 */
export async function getAdSettings(): Promise<AdSettingsData> {
  const now = Date.now();
  if (cachedSettings && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSettings;
  }

  // Check for environment variable overrides
  const envDisabled = process.env.ADS_ENABLED === "false" || process.env.NEXT_PUBLIC_ADS_ENABLED === "false";
  const env728Disabled = process.env.AD_728_ENABLED === "false";
  const env320Disabled = process.env.AD_320_ENABLED === "false";
  const envContainerDisabled = process.env.AD_CONTAINER_ENABLED === "false";
  const envSmartlinkDisabled = process.env.AD_SMARTLINK_ENABLED === "false";
  const envExternalScriptDisabled = process.env.AD_EXTERNAL_SCRIPT_ENABLED === "false";

  try {
    const dbRecord = await prisma.adSettings.findUnique({
      where: { id: "global" },
    });

    if (dbRecord) {
      cachedSettings = {
        ...dbRecord,
        adsEnabled: envDisabled ? false : dbRecord.adsEnabled,
        providerHighRevenue728: env728Disabled ? false : dbRecord.providerHighRevenue728,
        providerHighRevenue320: env320Disabled ? false : dbRecord.providerHighRevenue320,
        providerContainer: envContainerDisabled ? false : dbRecord.providerContainer,
        providerSmartlink: envSmartlinkDisabled ? false : dbRecord.providerSmartlink,
        providerProfitableRate: envExternalScriptDisabled ? false : dbRecord.providerProfitableRate,
      };
      lastCacheTime = now;
      return cachedSettings;
    }

    // Auto-create default settings record if DB is available
    const created = await prisma.adSettings.create({
      data: {
        id: "global",
        adsEnabled: !envDisabled,
        providerHighRevenue728: !env728Disabled,
        providerHighRevenue320: !env320Disabled,
        providerContainer: !envContainerDisabled,
        providerSmartlink: !envSmartlinkDisabled,
        providerProfitableRate: !envExternalScriptDisabled,
      },
    });

    cachedSettings = created;
    lastCacheTime = now;
    return cachedSettings;
  } catch {
    // If DB is offline or table does not exist, return safe defaults
    const fallback: AdSettingsData = {
      ...DEFAULT_AD_SETTINGS,
      adsEnabled: envDisabled ? false : DEFAULT_AD_SETTINGS.adsEnabled,
      providerHighRevenue728: env728Disabled ? false : DEFAULT_AD_SETTINGS.providerHighRevenue728,
      providerHighRevenue320: env320Disabled ? false : DEFAULT_AD_SETTINGS.providerHighRevenue320,
      providerContainer: envContainerDisabled ? false : DEFAULT_AD_SETTINGS.providerContainer,
      providerSmartlink: envSmartlinkDisabled ? false : DEFAULT_AD_SETTINGS.providerSmartlink,
      providerProfitableRate: envExternalScriptDisabled ? false : DEFAULT_AD_SETTINGS.providerProfitableRate,
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
