"use client";

import React, { useEffect } from "react";
import { AD_PROVIDERS } from "@/lib/ads/config";
import { loadAdScript } from "@/lib/ads/script-loader";

interface AdSmartLinkProps {
  placement?: string;
  className?: string;
  label?: string;
}

/**
 * CHILLER — SUPPLIED AD CODE 1 (Profitablerate SmartLink & Script)
 * 
 * Script: https://pl31526795.profitableratecpmnetwork.com/19/c9/9b/19c99b3212a84ec41f398c12acf68fa1.js
 * Smartlink URL: https://www.profitableratecpmnetwork.com/ujy49iz7mn?key=9d9f3f1de133e143e575ce2748c53035
 * 
 * Rules:
 * - NO auto-clicking or fake clicks.
 * - Genuine user navigation with rel="noopener noreferrer sponsored".
 * - Script loaded once without duplication.
 */
export function AdSmartLink({
  placement = "partner_recommendation",
  className = "",
  label = "Sponsored Partner Recommendation",
}: AdSmartLinkProps) {
  const config = AD_PROVIDERS.PROFITABLERATE_SMARTLINK;

  useEffect(() => {
    // Load the associated provider script once safely
    loadAdScript(config.scriptUrl, { async: true, timeoutMs: 8000 }).catch(() => {});
  }, [config.scriptUrl]);

  return (
    <div className={`my-4 flex items-center justify-center ${className}`}>
      <a
        href={config.url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/60 border border-white/10 hover:border-[#FF3B6B]/40 hover:bg-[#FF3B6B]/5 text-xs text-zinc-400 hover:text-white transition-all shadow-sm"
        data-ad-unit="smartlink"
        data-ad-placement={placement}
      >
        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/10 text-zinc-300 group-hover:bg-[#FF3B6B]/20 group-hover:text-[#FF3B6B]">
          Sponsored
        </span>
        <span className="font-medium">{label}</span>
        <svg
          className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#FF3B6B] transition-transform group-hover:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}
