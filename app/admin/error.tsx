"use client";

import React, { useEffect } from "react";
import Link from "next/link";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    // Log diagnostics cleanly on the client without exposing credentials or sensitive stack traces in the UI
    console.error("[CHILLER_CONTROL_CENTER_ERROR]", error?.message || error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-[#09090C] text-white">
      <div className="w-16 h-16 rounded-2xl bg-[#FF3B6B]/10 border border-[#FF3B6B]/20 flex items-center justify-center text-3xl mb-5 shadow-2xl">
        🛡️
      </div>

      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20 mb-3">
        CHILLER ROOT CONTROL
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
        Control Center Temporarily Unavailable
      </h1>

      <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
        A background operational service or telemetry pipeline encountered a transient state. Your session and administrative privileges remain secure.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => reset()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white font-bold text-xs shadow-lg shadow-[#FF3B6B]/20 transition cursor-pointer"
        >
          🔄 Retry Connection
        </button>

        <Link
          href="/admin"
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition cursor-pointer"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="mt-8 text-[11px] text-zinc-600 font-mono">
        Status: Protected • Multi-Admin Authority Active
      </div>
    </div>
  );
}
