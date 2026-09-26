"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AdPlacement, AdSettingsData, AdEligibilityResult } from "@/lib/ads/ad-types";
import { DEFAULT_AD_SETTINGS } from "@/lib/ads/config";
import { evaluateAdEligibility, logAdImpression } from "@/lib/ads/ad-manager";
import { recordSessionImpression } from "@/lib/ads/ad-frequency";
import { AdSafeWrapper } from "./AdSafeWrapper";
import { AdContainer } from "./AdContainer";
import { ResponsiveBannerAd } from "./ResponsiveBannerAd";

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
  minHeight?: number;
}

export function AdSlot({
  placement,
  className = "",
  minHeight,
}: AdSlotProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const slotRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [eligibility, setEligibility] = useState<AdEligibilityResult | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<AdSettingsData>(DEFAULT_AD_SETTINGS);

  // Admin debug mode check (?adsDebug=true)
  const isDebugRequested = searchParams?.get("adsDebug") === "true";
  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const showDebugInfo = isDebugRequested && isSuperAdmin;

  // 1. Fetch latest ad settings from /api/ads/config
  useEffect(() => {
    let active = true;
    fetch("/api/ads/config")
      .then((res) => (res.ok ? res.json() : DEFAULT_AD_SETTINGS))
      .then((data) => {
        if (active && data) {
          setSettings(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // 2. IntersectionObserver: Only activate when scrolled near viewport
  useEffect(() => {
    if (!slotRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "150px" } // 150px prefetch margin
    );

    observer.observe(slotRef.current);
    return () => observer.disconnect();
  }, []);

  // 3. Evaluate eligibility when in view or when dependencies change
  useEffect(() => {
    if (!inView || dismissed) return;

    const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
    const userContext = session?.user
      ? {
          id: (session.user as any).id,
          email: session.user.email,
          role: (session.user as any).role,
          tier: (session.user as any).tier,
          adsFree: (session.user as any).adsFree,
        }
      : null;

    const result = evaluateAdEligibility(
      placement,
      pathname,
      userContext,
      isMobile,
      settings
    );

    setEligibility(result);
  }, [inView, dismissed, pathname, session, settings, placement]);

  // If user dismissed this placement
  if (dismissed) {
    return null;
  }

  // Debug Panel for Super Admins
  if (showDebugInfo) {
    return (
      <div className="mx-auto my-4 p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 text-xs text-amber-200 font-mono max-w-xl">
        <div className="flex items-center justify-between font-bold border-b border-amber-500/20 pb-1 mb-2">
          <span>⚙️ [ADS DEBUG] Slot: {placement}</span>
          <span className={eligibility?.eligible ? "text-emerald-400" : "text-rose-400"}>
            {eligibility?.eligible ? "ELIGIBLE" : "INELIGIBLE"}
          </span>
        </div>
        <p><strong>Reason:</strong> {eligibility?.reason || "Evaluating..."}</p>
        <p><strong>Provider:</strong> {eligibility?.provider || "N/A"}</p>
        <p><strong>Format:</strong> {eligibility?.format || "N/A"}</p>
        <p><strong>User AdsFree:</strong> {String((session?.user as any)?.adsFree)}</p>
        <p><strong>Global Ads:</strong> {String(settings.adsEnabled)}</p>
      </div>
    );
  }

  // If evaluated and ineligible, collapse naturally without empty space
  if (eligibility && !eligibility.eligible) {
    return null;
  }

  const handleLoaded = () => {
    setLoaded(true);
    recordSessionImpression(placement);
    const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
    logAdImpression({
      provider: eligibility?.provider || "unknown",
      placement,
      page: pathname,
      deviceType: isMobile ? "mobile" : "desktop",
      status: "success",
    });
  };

  const handleError = (errMsg: string) => {
    const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
    logAdImpression({
      provider: eligibility?.provider || "unknown",
      placement,
      page: pathname,
      deviceType: isMobile ? "mobile" : "desktop",
      status: "failed",
    });
  };

  return (
    <div ref={slotRef} className="w-full">
      {inView && eligibility?.eligible && (
        <AdSafeWrapper>
          <AdContainer
            placement={placement}
            className={className}
            minHeight={minHeight}
            onDismiss={() => setDismissed(true)}
          >
            <ResponsiveBannerAd
              preferredProvider={eligibility.provider}
              onLoaded={handleLoaded}
              onError={handleError}
            />
          </AdContainer>
        </AdSafeWrapper>
      )}
    </div>
  );
}
