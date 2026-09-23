"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    try {
      const dismissed = localStorage.getItem("chiller_pwa_dismissed");
      if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) {
        return; // Dismissed within 7 days
      }
    } catch {}

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch (err) {
      console.warn("PWA install prompt error:", err);
    } finally {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem("chiller_pwa_dismissed", String(Date.now()));
    } catch {}
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100%-2rem)] animate-slide-up">
      <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#0F172A]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80">
        <div className="relative w-11 h-11 shrink-0 rounded-xl overflow-hidden shadow-md shadow-[#FF3B6B]/20">
          <Image
            src="/branding/chiller-app-icon.png"
            alt="CHILLER"
            fill
            className="object-contain"
            sizes="44px"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-white tracking-wide truncate">
            Install CHILLER App
          </h4>
          <p className="text-[11px] text-zinc-400 truncate">
            Watch beyond with standalone speed
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-md shadow-[#FF3B6B]/30 hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-white p-1 text-xs font-bold cursor-pointer"
            aria-label="Dismiss install banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
