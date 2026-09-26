"use client";

import React, { useEffect, useRef, useState } from "react";
import { AdProviderId } from "@/lib/ads/ad-types";
import { AD_PROVIDERS } from "@/lib/ads/config";
import { recordProviderFailure } from "@/lib/ads/ad-manager";

interface BannerAdProps {
  provider: AdProviderId;
  width?: number;
  height?: number;
  onLoaded?: () => void;
  onError?: (err: string) => void;
}

export function BannerAd({
  provider,
  width,
  height,
  onLoaded,
  onError,
}: BannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    let isMounted = true;

    try {
      if (provider === "highrevenue_728x90" || provider === "highrevenue_320x50") {
        const is728 = provider === "highrevenue_728x90";
        const config = is728 ? AD_PROVIDERS.HIGHREVENUE_728x90 : AD_PROVIDERS.HIGHREVENUE_320x50;
        const w = width || config.width;
        const h = height || config.height;

        // Render HighRevenueFormat via clean isolated iframe to avoid global variable clobbering
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          const iframe = document.createElement("iframe");
          iframe.width = `${w}`;
          iframe.height = `${h}`;
          iframe.style.border = "none";
          iframe.style.overflow = "hidden";
          iframe.scrolling = "no";
          iframe.title = "Advertisement";
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
                <style>
                  body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                </style>
              </head>
              <body>
                <script type="text/javascript">
                  atOptions = {
                    'key' : '${config.key}',
                    'format' : 'iframe',
                    'height' : ${h},
                    'width' : ${w},
                    'params' : {}
                  };
                </script>
                <script type="text/javascript" src="${config.scriptUrl}"></script>
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
              recordProviderFailure(provider);
              onError?.("Iframe load failure");
            }
          };

          containerRef.current.appendChild(iframe);
        }
      } else if (provider === "profitablerate_invoke") {
        const config = AD_PROVIDERS.PROFITABLERATE_INVOKE;
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          const unitContainer = document.createElement("div");
          unitContainer.id = config.containerId;

          const script = document.createElement("script");
          script.async = true;
          script.setAttribute("data-cfasync", "false");
          script.src = config.scriptUrl;

          script.onload = () => {
            if (isMounted) {
              setIsRendered(true);
              onLoaded?.();
            }
          };
          script.onerror = () => {
            if (isMounted) {
              recordProviderFailure(provider);
              onError?.("Script load failure");
            }
          };

          containerRef.current.appendChild(unitContainer);
          containerRef.current.appendChild(script);
        }
      } else if (provider === "profitablerate_cpm") {
        const config = AD_PROVIDERS.PROFITABLERATE_CPM;
        const script = document.createElement("script");
        script.src = config.scriptUrl;
        script.async = true;
        script.onload = () => {
          if (isMounted) {
            setIsRendered(true);
            onLoaded?.();
          }
        };
        script.onerror = () => {
          if (isMounted) {
            recordProviderFailure(provider);
            onError?.("Network script failure");
          }
        };
        if (containerRef.current) {
          containerRef.current.appendChild(script);
        }
      } else if (provider === "profitablerate_smartlink") {
        const config = AD_PROVIDERS.PROFITABLERATE_SMARTLINK;
        const script = document.createElement("script");
        script.src = config.scriptUrl;
        script.async = true;
        script.onload = () => {
          if (isMounted) {
            setIsRendered(true);
            onLoaded?.();
          }
        };
        script.onerror = () => {
          if (isMounted) {
            recordProviderFailure(provider);
            onError?.("Smartlink script failure");
          }
        };
        if (containerRef.current) {
          containerRef.current.appendChild(script);
        }
      }
    } catch (err: any) {
      recordProviderFailure(provider);
      onError?.(err?.message || "Render exception");
    }

    return () => {
      isMounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [provider, width, height, onLoaded, onError]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center overflow-hidden max-w-full"
      style={{
        minHeight: height ? `${height}px` : undefined,
        minWidth: width ? `${Math.min(width, 320)}px` : undefined,
      }}
    />
  );
}
