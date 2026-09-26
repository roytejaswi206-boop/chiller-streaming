"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { CLIENT_HEARTBEAT_INTERVAL_MS } from "@/lib/analytics/config";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = localStorage.getItem("chiller_sid");
    if (!sid) {
      sid = "cs_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem("chiller_sid", sid);
    }
    return sid;
  } catch {
    return "cs_anonymous";
  }
}

function getDeviceType(): "mobile" | "desktop" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const isTouch = navigator.maxTouchPoints > 0;
  const width = window.innerWidth;

  if (/iPad|tablet/i.test(ua) || (isTouch && width >= 768 && width <= 1024)) {
    return "tablet";
  }
  if (/Mobile|Android|iPhone|iPod/i.test(ua) || (isTouch && width < 768)) {
    return "mobile";
  }
  return "desktop";
}

export function ActivityTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string>("");
  const lastVisitSentRef = useRef<number>(0);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    const device = getDeviceType();
    const now = Date.now();

    // 1. Send Visit if path changed or > 30s since last
    if (pathname !== lastPathRef.current || now - lastVisitSentRef.current > 30000) {
      lastPathRef.current = pathname;
      lastVisitSentRef.current = now;

      fetch("/api/analytics/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          type: "VISIT",
          device,
          route: pathname,
        }),
        keepalive: true,
      }).catch(() => {});
    }

    // 2. Periodic heartbeat while tab is visible
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetch("/api/analytics/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            type: "HEARTBEAT",
            device,
            route: pathname,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    }, CLIENT_HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
