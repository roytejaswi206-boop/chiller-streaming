"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "info" | "success" | "warning" | "error";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 3200) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Notification Container with Safe Area & Motion */}
      <div
        aria-live="polite"
        className="fixed top-4 sm:top-5 right-4 z-[9999] pointer-events-none flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {toasts.map((t) => {
          const typeStyles: Record<ToastType, { icon: string; border: string; bg: string }> = {
            success: {
              icon: "✓",
              border: "border-emerald-500/40",
              bg: "bg-[#09090C]/95 text-emerald-400",
            },
            info: {
              icon: "ℹ",
              border: "border-[#8A5CFF]/40",
              bg: "bg-[#09090C]/95 text-[#A78BFA]",
            },
            warning: {
              icon: "⚠",
              border: "border-amber-500/40",
              bg: "bg-[#09090C]/95 text-amber-300",
            },
            error: {
              icon: "✕",
              border: "border-[#FF3B6B]/40",
              bg: "bg-[#09090C]/95 text-[#FF3B6B]",
            },
          };

          const s = typeStyles[t.type] || typeStyles.info;

          return (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              className={`pointer-events-auto cursor-pointer flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-2xl border ${s.border} ${s.bg} shadow-[0_12px_40px_rgba(0,0,0,0.8)] text-xs font-semibold text-white animate-in fade-in slide-in-from-top-3 duration-200`}
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-mono font-bold text-[11px]">
                {s.icon}
              </span>
              <span className="flex-1 leading-snug">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    return {
      showToast: (msg: string) => {
        if (typeof window !== "undefined") console.log("[Toast]", msg);
      },
    };
  }
  return context;
}
