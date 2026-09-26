"use client";

import React, { useEffect, useState } from "react";
import { BannerAd } from "./BannerAd";
import { AdProviderId } from "@/lib/ads/ad-types";

interface ResponsiveBannerAdProps {
  preferredProvider?: AdProviderId;
  onLoaded?: () => void;
  onError?: (err: string) => void;
}

export function ResponsiveBannerAd({
  preferredProvider,
  onLoaded,
  onError,
}: ResponsiveBannerAdProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  if (!mounted) {
    // Return empty placeholder container during SSR to prevent layout jump
    return <div className="h-[90px] w-full max-w-[728px]" />;
  }

  // Choose provider based on viewport
  let activeProvider: AdProviderId;
  let width: number;
  let height: number;

  if (isMobile) {
    activeProvider = preferredProvider === "profitablerate_invoke" ? "profitablerate_invoke" : "highrevenue_320x50";
    width = 320;
    height = 50;
  } else {
    activeProvider = preferredProvider === "profitablerate_invoke" ? "profitablerate_invoke" : "highrevenue_728x90";
    width = 728;
    height = 90;
  }

  return (
    <BannerAd
      provider={activeProvider}
      width={width}
      height={height}
      onLoaded={onLoaded}
      onError={onError}
    />
  );
}
