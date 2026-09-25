"use client";

import React from "react";
import Image from "next/image";
import { usePwaUpdate } from "./PwaUpdateManager";

export function PwaUpdateBanner() {
  const { updateAvailable, isUpdating, updateNow, dismissUpdate } = usePwaUpdate();

  if (!updateAvailable) return null;

  return (
    <aside
      aria-label="App update notification"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 right-4 sm:right-6 z-[60] max-w-md w-[calc(100%-2rem)] sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-none"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-4 rounded-2xl bg-[#0F172A]/98 backdrop-blur-2xl border border-[#FF3B6B]/40 shadow-[0_12px_48px_rgba(0,0,0,0.9)] shadow-[#FF3B6B]/15 pointer-events-auto">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* App Icon */}
          <div className="relative w-10 h-10 shrink-0 rounded-xl overflow-hidden border border-white/15 shadow-md shadow-[#FF3B6B]/20 bg-black/40">
            <Image
              src="/branding/chiller-app-icon.png"
              alt="CHILLER"
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF3B6B] animate-pulse" />
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                New CHILLER Version Available
              </h4>
            </div>
            <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
              A new version of CHILLER is ready.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
          <button
            type="button"
            onClick={dismissUpdate}
            disabled={isUpdating}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] font-bold tracking-wide transition cursor-pointer disabled:opacity-50 touch-manipulation active:scale-95"
          >
            Later
          </button>

          <button
            type="button"
            onClick={updateNow}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-[#FF3B6B]/30 hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-50 touch-manipulation"
          >
            {isUpdating ? (
              <>
                <svg
                  className="animate-spin -ml-0.5 mr-1 h-3 w-3 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Updating...</span>
              </>
            ) : (
              <span>Update Now</span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
