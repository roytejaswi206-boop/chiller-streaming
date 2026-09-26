"use client";

import React, { useEffect, useRef, useState } from "react";
import { AD_PROVIDERS } from "@/lib/ads/config";
import { recordProviderFailure } from "@/lib/ads/ad-manager";

interface NativeAdProps {
  className?: string;
  minHeight?: number;
  onLoaded?: () => void;
  onError?: (err: string) => void;
}

export function NativeAd({
  className = "",
  minHeight = 180,
  onLoaded,
  onError,
}: NativeAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const config = AD_PROVIDERS.PROFITABLERATE_INVOKE;

    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";

        // Isolated iframe execution ensures Adsterra invoke.js executes cleanly without
        // collision with parent React DOM, Next.js SPA router, or multiple ad containers
        const iframe = document.createElement("iframe");
        iframe.style.width = "100%";
        iframe.style.height = `${minHeight}px`;
        iframe.style.border = "none";
        iframe.style.overflow = "hidden";
        iframe.scrolling = "no";
        iframe.title = "Sponsored Content Advertisement";
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
              <base target="_blank">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                *, *::before, *::after { box-sizing: border-box; }
                body {
                  margin: 0;
                  padding: 0;
                  background: transparent;
                  color: #94a3b8;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                  width: 100%;
                }
                #${config.containerId} {
                  width: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: ${minHeight - 20}px;
                }
              </style>
            </head>
            <body>
              <div id="${config.containerId}"></div>
              <script async="async" data-cfasync="false" src="${config.scriptUrl}"></script>
            </body>
          </html>
        `;

        iframe.srcdoc = docContent;

        iframe.onload = () => {
          if (isMounted) {
            setIsRendered(true);
            onLoaded?.();
          }
        };

        iframe.onerror = () => {
          if (isMounted) {
            setHasError(true);
            recordProviderFailure(config.id);
            onError?.("Native ad iframe load error");
          }
        };

        containerRef.current.appendChild(iframe);
      }
    } catch (err: any) {
      if (isMounted) {
        setHasError(true);
        recordProviderFailure(config.id);
        onError?.(err?.message || "Native ad exception");
      }
    }

    return () => {
      isMounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [minHeight, onLoaded, onError]);

  if (hasError) {
    return null;
  }

  return (
    <div
      className={`w-full max-w-5xl mx-auto my-6 rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-md p-3 sm:p-4 shadow-xl transition-all ${className}`}
      data-adsterra-native="true"
    >
      {/* Explicit non-deceptive sponsored header label (Phase 7 requirement) */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full">
            Sponsored / Advertisement
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-medium tracking-tight">
          Adsterra Network
        </span>
      </div>

      {/* Adsterra Native Container */}
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center overflow-hidden"
        style={{ minHeight: `${minHeight}px` }}
      />
    </div>
  );
}
