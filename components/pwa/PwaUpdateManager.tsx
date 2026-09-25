"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { CHILLER_APP_VERSION, CHILLER_BUILD_ID } from "@/lib/config/version";
import { PwaUpdateBanner } from "./PwaUpdateBanner";

interface PwaUpdateContextType {
  updateAvailable: boolean;
  isUpdating: boolean;
  isStandalone: boolean;
  serverVersion: string | null;
  clientVersion: string;
  clientBuildId: string;
  updateNow: () => Promise<void>;
  dismissUpdate: () => void;
}

const PwaUpdateContext = createContext<PwaUpdateContextType>({
  updateAvailable: false,
  isUpdating: false,
  isStandalone: false,
  serverVersion: null,
  clientVersion: CHILLER_APP_VERSION,
  clientBuildId: CHILLER_BUILD_ID,
  updateNow: async () => {},
  dismissUpdate: () => {},
});

export function usePwaUpdate() {
  return useContext(PwaUpdateContext);
}

export function PwaUpdateManager({ children }: { children?: React.ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const hasReloadedRef = useRef(false);

  // Standalone PWA Detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener?.("change", checkStandalone);

    return () => {
      mediaQuery.removeEventListener?.("change", checkStandalone);
    };
  }, []);

  // Service Worker Registration and Update Detection Lifecycle
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Check if we just reloaded for an update to avoid infinite loops
    try {
      const lastReload = sessionStorage.getItem("chiller_last_update_reload");
      if (lastReload && Date.now() - Number(lastReload) < 15000) {
        hasReloadedRef.current = true;
      }
    } catch {}

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      console.log("[PWA Update] Controller changed — reloading to activate new CHILLER version");
      try {
        sessionStorage.setItem("chiller_last_update_reload", String(Date.now()));
      } catch {}
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registrationRef.current = reg;
        console.log("[PWA Update] Service Worker registered with scope:", reg.scope);

        // 1. Check if a waiting worker is already present
        if (reg.waiting) {
          console.log("[PWA Update] Existing waiting worker detected");
          waitingWorkerRef.current = reg.waiting;
          if (!hasReloadedRef.current) {
            setUpdateAvailable(true);
          }
        }

        // 2. Listen for newly discovered updates
        reg.addEventListener("updatefound", () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("[PWA Update] New service worker installed and waiting");
              waitingWorkerRef.current = installingWorker;
              if (!hasReloadedRef.current) {
                setUpdateAvailable(true);
              }
            }
          });
        });

        // 3. Proactively trigger update check on startup
        reg.update().catch((err) => {
          console.warn("[PWA Update] SW update check warning:", err);
        });
      })
      .catch((err) => {
        console.warn("[PWA Update] Registration error:", err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  // Periodic and Event-Driven Server Version Verification
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    const checkServerVersion = async () => {
      try {
        // Fetch fresh version with cache busting
        const res = await fetch(`/api/version?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        if (!isMounted) return;

        if (data?.buildId) {
          setServerVersion(data.buildId);

          // If server build ID differs from current client build ID
          if (data.buildId !== CHILLER_BUILD_ID) {
            console.log(
              `[PWA Update] Server version mismatch detected: Server=${data.buildId}, Client=${CHILLER_BUILD_ID}`
            );

            // Proactively request Service Worker update
            if (registrationRef.current) {
              registrationRef.current.update().catch(() => {});
            }

            if (!hasReloadedRef.current) {
              setUpdateAvailable(true);
            }
          }
        }
      } catch (err) {
        // Silently fail offline
      }
    };

    // Immediate check 5s after startup
    const initialTimer = setTimeout(checkServerVersion, 5000);

    // Periodic check every 15 minutes
    const intervalTimer = setInterval(checkServerVersion, 15 * 60 * 1000);

    // Check when user resumes or focuses the app
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkServerVersion();
        if (registrationRef.current) {
          registrationRef.current.update().catch(() => {});
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("pageshow", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("pageshow", handleVisibilityChange);
    };
  }, []);

  // Execute User-Initiated Update
  const updateNow = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      // 1. Safely store resume coordinate if currently watching a video
      if (typeof window !== "undefined") {
        const path = window.location.pathname + window.location.search;
        if (path.includes("/watch/")) {
          localStorage.setItem(
            "chiller_update_resume_path",
            JSON.stringify({ path, timestamp: Date.now() })
          );
        }
        sessionStorage.setItem("chiller_last_update_reload", String(Date.now()));
      }

      // 2. Check for waiting worker to send SKIP_WAITING
      const waiting =
        waitingWorkerRef.current || registrationRef.current?.waiting;

      if (waiting) {
        console.log("[PWA Update] Dispatching SKIP_WAITING to waiting worker...");
        waiting.postMessage({ type: "SKIP_WAITING" });

        // Fallback reload if controllerchange doesn't trigger within 2.5s
        setTimeout(() => {
          console.log("[PWA Update] Fallback reload timeout reached");
          window.location.reload();
        }, 2500);
      } else {
        // If triggered via version mismatch without waiting worker, reload to fetch latest assets
        console.log("[PWA Update] No waiting worker, direct reload to fetch fresh assets");
        window.location.reload();
      }
    } catch (err) {
      console.error("[PWA Update] Error during update execution:", err);
      window.location.reload();
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  return (
    <PwaUpdateContext.Provider
      value={{
        updateAvailable,
        isUpdating,
        isStandalone,
        serverVersion,
        clientVersion: CHILLER_APP_VERSION,
        clientBuildId: CHILLER_BUILD_ID,
        updateNow,
        dismissUpdate,
      }}
    >
      {children}
      <PwaUpdateBanner />
    </PwaUpdateContext.Provider>
  );
}
