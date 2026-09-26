"use client";

import { useEffect } from "react";
import { AD_PROVIDERS } from "@/lib/ads/config";
import { loadAdScript } from "@/lib/ads/script-loader";

interface AdScriptProps {
  enabled?: boolean;
}

/**
 * CHILLER — SUPPLIED AD CODE 5 (External Network Script)
 * 
 * Script: https://pl31522715.profitableratecpmnetwork.com/ca/d9/72/cad9727ff2ff49f5370a1cb10d3c2b07.js
 * 
 * Loads the network script once safely with singleton protection and error isolation.
 */
export function AdScript({ enabled = true }: AdScriptProps) {
  useEffect(() => {
    if (!enabled) return;

    const config = AD_PROVIDERS.PROFITABLERATE_CPM;
    loadAdScript(config.scriptUrl, {
      async: true,
      cfAsync: false,
      timeoutMs: 8000,
    }).catch(() => {
      // Graceful error isolation
    });
  }, [enabled]);

  return null;
}
