"use client";

import React, { useEffect, useRef, useState } from "react";
import { AD_PROVIDERS } from "@/lib/ads/config";

interface AdBanner728x90Props {
  placement?: string;
  className?: string;
  onLoaded?: () => void;
  onError?: (err: string) => void;
}

/**
 * CHILLER — SUPPLIED AD CODE 2 (728x90 Desktop Leaderboard)
 * 
 * Provider: HighRevenueFormat
 * Key: b541512a190670f60deae70ce055bb3e
 * Format: iframe (728x90)
 * 
 * Isolates atOptions inside a sandboxed iframe to prevent collision with 320x50.
 */
export function AdBanner728x90({
  placement = "content_desktop",
  className = "",
  onLoaded,
  onError,
}: AdBanner728x90Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const config = AD_PROVIDERS.HIGHREVENUE_728x90;

    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    try {
      const iframe = document.createElement("iframe");
      iframe.width = `${config.width}`;
      iframe.height = `${config.height}`;
      iframe.style.border = "none";
      iframe.style.overflow = "hidden";
      iframe.scrolling = "no";
      iframe.title = "Advertisement Leaderboard";
      iframe.setAttribute("loading", "lazy");
      iframe.sandbox.add(
        "allow-scripts",
        "allow-same-origin",
        "allow-popups",
        "allow-popups-to-escape-sandbox",
        "allow-forms"
      );

      const docContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <base target="_blank">
            <style>
              body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            </style>
          </head>
          <body>
            <script type="text/javascript">
              atOptions = {
                'key' : '${config.key}',
                'format' : 'iframe',
                'height' : ${config.height},
                'width' : ${config.width},
                'params' : {}
              };
            </script>
            <script type="text/javascript" src="${config.scriptUrl}"></script>
          </body>
        </html>
      `;

      iframe.srcdoc = docContent;

      iframe.onload = () => {
        if (!mounted) return;
        setRendered(true);
        onLoaded?.();

        // Non-blocking telemetry ingestion (record as render, not fake click)
        try {
          fetch("/api/ads/impression", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: config.id,
              placement,
              page: window.location.pathname,
              deviceType: "desktop",
              status: "success",
            }),
          }).catch(() => {});
        } catch {}
      };

      iframe.onerror = () => {
        if (!mounted) return;
        setFailed(true);
        onError?.("Leaderboard load failed");
      };

      containerRef.current.appendChild(iframe);
    } catch (err: any) {
      if (!mounted) return;
      setFailed(true);
      onError?.(err?.message || "Execution exception");
    }

    return () => {
      mounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [placement, onLoaded, onError]);

  if (failed) {
    return null;
  }

  return (
    <div
      className={`hidden md:flex flex-col items-center justify-center my-6 max-w-full overflow-hidden ${className}`}
      style={{ minHeight: "90px" }}
      data-ad-unit="728x90"
      data-ad-placement={placement}
    >
      <div className="w-[728px] max-w-full flex items-center justify-between px-2 py-0.5 mb-1 text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
        <span>Sponsored</span>
        <span>728×90</span>
      </div>
      <div
        ref={containerRef}
        className="w-[728px] h-[90px] max-w-full flex items-center justify-center rounded-lg bg-black/20 border border-white/5 overflow-hidden"
      />
    </div>
  );
}
