"use client";

import React, { ReactNode } from "react";
import { AdPlacement } from "@/lib/ads/ad-types";
import { recordSessionDismissal } from "@/lib/ads/ad-frequency";

interface AdContainerProps {
  placement: AdPlacement;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
  minHeight?: number;
}

export function AdContainer({
  placement,
  children,
  onDismiss,
  className = "",
  minHeight = 90,
}: AdContainerProps) {
  const handleClose = () => {
    recordSessionDismissal(placement);
    onDismiss?.();
  };

  return (
    <div
      className={`relative mx-auto my-6 p-2 rounded-2xl bg-zinc-950/40 border border-white/[0.06] backdrop-blur-sm max-w-full flex flex-col items-center justify-center transition-all ${className}`}
      style={{ minHeight: `${minHeight}px` }}
      data-chiller-ad-placement={placement}
    >
      {/* Top subtle bar: Advertisement label + dismiss button */}
      <div className="w-full flex items-center justify-between px-3 py-1 mb-1 border-b border-white/[0.04]">
        <span className="text-[9px] font-bold tracking-widest uppercase text-zinc-500 select-none">
          Sponsored
        </span>
        <button
          onClick={handleClose}
          aria-label="Dismiss Advertisement"
          className="text-zinc-500 hover:text-zinc-300 text-xs px-1.5 py-0.5 rounded hover:bg-white/5 transition flex items-center gap-1"
        >
          <span className="text-[10px]">Close</span>
          <span className="font-bold">×</span>
        </button>
      </div>

      {/* Main Ad Content */}
      <div className="w-full flex items-center justify-center overflow-hidden py-1">
        {children}
      </div>
    </div>
  );
}
