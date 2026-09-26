"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AdSettingsData } from "@/lib/ads/ad-types";
import { DEFAULT_AD_SETTINGS } from "@/lib/ads/config";
import { AdBanner728x90 } from "./AdBanner728x90";
import { AdBanner320x50 } from "./AdBanner320x50";
import { AdContainer } from "./AdContainer";
import { AdScript } from "./AdScript";

interface AdContextValue {
  settings: AdSettingsData;
  isAdFree: boolean;
  isReady: boolean;
}

const AdContext = createContext<AdContextValue>({
  settings: DEFAULT_AD_SETTINGS,
  isAdFree: false,
  isReady: false,
});

export function useAdManager() {
  return useContext(AdContext);
}

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdSettingsData>(DEFAULT_AD_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    fetch("/api/ads/config")
      .then((res) => (res.ok ? res.json() : DEFAULT_AD_SETTINGS))
      .then((cfg) => {
        if (cfg) setSettings(cfg);
      })
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, []);

  return (
    <AdContext.Provider value={{ settings, isAdFree: false, isReady }}>
      {/* Load Code 5 external network script once if enabled */}
      {settings.adsEnabled && settings.providerProfitableRate && (
        <AdScript enabled={true} />
      )}
      {children}
    </AdContext.Provider>
  );
}

interface ResponsiveAdSlotProps {
  placement: string;
  className?: string;
  allowContainer?: boolean;
}

/**
 * Universal Responsive Ad Slot:
 * - Desktop: Renders 728x90 (Supplied Code 2)
 * - Mobile: Renders 320x50 (Supplied Code 3)
 * - Fully isolated, centered, no horizontal overflow.
 */
export function ResponsiveAdSlot({
  placement,
  className = "",
  allowContainer = false,
}: ResponsiveAdSlotProps) {
  const { settings, isAdFree } = useAdManager();

  if (!settings.adsEnabled || isAdFree) {
    return null;
  }

  // Check route-specific switches
  if (placement.startsWith("home") && !settings.homeEnabled) return null;
  if (placement.startsWith("movie") && !settings.movieEnabled) return null;
  if (placement.startsWith("series") && !settings.seriesEnabled) return null;
  if (placement.startsWith("anime") && !settings.animeEnabled) return null;
  if (placement.startsWith("detail") && !settings.detailEnabled) return null;
  if (placement.startsWith("player") && !settings.watchEnabled) return null;

  return (
    <div
      className={`chiller-ad-slot-wrapper w-full flex flex-col items-center justify-center my-4 overflow-hidden ${className}`}
      data-ad-placement={placement}
    >
      {/* Desktop Leaderboard 728x90 */}
      {settings.desktopEnabled && settings.providerHighRevenue728 && (
        <AdBanner728x90 placement={`${placement}_desktop`} />
      )}

      {/* Mobile Banner 320x50 */}
      {settings.mobileEnabled && settings.providerHighRevenue320 && (
        <AdBanner320x50 placement={`${placement}_mobile`} />
      )}

      {/* Optional Container Ad where specifically requested */}
      {allowContainer && settings.providerContainer && (
        <AdContainer placement={`${placement}_container`} />
      )}
    </div>
  );
}
