"use client";

import React, { useEffect, useRef, useState, ReactNode } from "react";
import { AD_PROVIDERS } from "@/lib/ads/config";

export interface AdContainerProps {
  placement?: string;
  className?: string;
  children?: ReactNode;
  minHeight?: number;
  onDismiss?: () => void;
}

/**
 * CHILLER — SUPPLIED AD CODE 4 (Profitablerate Invoke Container & Wrapper)
 * 
 * Script: https://pl31522716.profitableratecpmnetwork.com/036795d0ec9ca91f70d3e5f8d8def3c3/invoke.js
 * Container ID: container-036795d0ec9ca91f70d3e5f8d8def3c3
 * 
 * Guarantees:
 * - When used without children: Renders the exact supplied container ad unit with single DOM ID guarantee.
 * - When used with children: Stylizes the child ad with respectful sponsorship labeling and dismiss controls.
 * - Safely cleans up on route change and unmount to prevent duplicate ID errors.
 */
export function AdContainer({
  placement = "content_container",
  className = "",
  children,
  minHeight = 90,
  onDismiss,
}: AdContainerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);

  // If children are passed, render as styled sponsored wrapper
  if (children) {
    return (
      <div
        className={`relative mx-auto my-6 p-2 rounded-2xl bg-zinc-950/40 border border-white/[0.06] backdrop-blur-sm max-w-full flex flex-col items-center justify-center transition-all ${className}`}
        style={{ minHeight: `${minHeight}px` }}
        data-chiller-ad-placement={placement}
      >
        <div className="w-full flex items-center justify-between px-3 py-1 mb-1 border-b border-white/[0.04]">
          <span className="text-[9px] font-bold tracking-widest uppercase text-zinc-500 select-none">
            Sponsored
          </span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label="Dismiss Advertisement"
              className="text-zinc-500 hover:text-zinc-300 text-xs px-1.5 py-0.5 rounded hover:bg-white/5 transition flex items-center gap-1"
            >
              <span className="text-[10px]">Close</span>
              <span className="font-bold">×</span>
            </button>
          )}
        </div>
        <div className="w-full flex items-center justify-center overflow-hidden py-1">
          {children}
        </div>
      </div>
    );
  }

  // Standalone Supplied Code 4 Container Ad
  useEffect(() => {
    let mounted = true;
    const config = AD_PROVIDERS.PROFITABLERATE_INVOKE;

    // Check if an element with this ID already exists anywhere in the DOM
    const existingElement = document.getElementById(config.containerId);
    if (existingElement && existingElement.parentElement !== wrapperRef.current) {
      existingElement.remove();
    }

    if (!wrapperRef.current) return;
    wrapperRef.current.innerHTML = "";

    try {
      // Create the single container element with the exact supplied ID
      const containerDiv = document.createElement("div");
      containerDiv.id = config.containerId;
      containerDiv.className = "chiller-ad-target-container w-full min-h-[90px] flex items-center justify-center";
      wrapperRef.current.appendChild(containerDiv);

      // Inject the script with exact attributes: async="async" data-cfasync="false"
      const script = document.createElement("script");
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.src = config.scriptUrl;

      script.onload = () => {
        if (!mounted) return;
        setRendered(true);

        try {
          fetch("/api/ads/impression", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: config.id,
              placement,
              page: window.location.pathname,
              deviceType: window.innerWidth >= 768 ? "desktop" : "mobile",
              status: "success",
            }),
          }).catch(() => {});
        } catch {}
      };

      script.onerror = () => {
        if (!mounted) return;
        setFailed(true);
      };

      wrapperRef.current.appendChild(script);
    } catch {
      if (mounted) setFailed(true);
    }

    return () => {
      mounted = false;
      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = "";
      }
      const leftover = document.getElementById(config.containerId);
      if (leftover) {
        leftover.remove();
      }
    };
  }, [placement]);

  if (failed) {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      className={`mx-auto my-6 max-w-full overflow-hidden flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-950/40 border border-white/5 ${className}`}
      data-ad-unit="container-invoke"
      data-ad-placement={placement}
    />
  );
}
