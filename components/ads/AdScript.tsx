"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AD_PROVIDERS } from "@/lib/ads/config";
import { loadAdScript, isAuthPath } from "@/lib/ads/script-loader";

interface AdScriptProps {
  enabled?: boolean;
}

/**
 * CHILLER — SUPPLIED AD CODE 5 (External Network Script)
 * 
 * Script: https://pl31522715.profitableratecpmnetwork.com/ca/d9/72/cad9727ff2ff49f5370a1cb10d3c2b07.js
 * 
 * Loads the network script once safely with singleton protection and error isolation.
 * STRICT SECURITY: Never mounts or executes on authentication pages.
 */
export function AdScript({ enabled = false }: AdScriptProps) {
  // Popunder / global network scripts are disabled to ensure normal CHILLER
  // navigation (movie cards, watch buttons, player controls) is never hijacked by ads.
  return null;
}
