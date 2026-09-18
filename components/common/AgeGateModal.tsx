"use client";

import React from "react";
import { VeloraLogo } from "@/components/icons";
import { useAgeGate } from "@/components/providers";

export function AgeGateModal() {
  const { isAgeVerified, verifyAge } = useAgeGate();

  if (isAgeVerified) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#121218] p-8 shadow-2xl text-center">
        {/* Glow effect */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FF3864]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-center mb-6">
          <VeloraLogo className="w-12 h-12" withText={false} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-bold uppercase tracking-wider mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          18+ Adults Only
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white mb-3">
          Age Verification
        </h2>

        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          This website contains adult-oriented content intended strictly for adults aged 18 years and older (or legal age of majority in your jurisdiction).
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              window.location.href = "https://www.google.com";
            }}
            className="flex-1 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-semibold transition cursor-pointer"
          >
            Exit Website
          </button>
          <button
            onClick={verifyAge}
            className="flex-1 py-3 px-4 rounded-xl velora-gradient hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-rose-600/30 transition transform active:scale-95 cursor-pointer"
          >
            I am 18 or Older
          </button>
        </div>

        <p className="mt-6 text-[11px] text-zinc-500">
          By entering, you confirm that you are at least 18 years of age and consent to viewing adult-oriented material.
        </p>
      </div>
    </div>
  );
}
