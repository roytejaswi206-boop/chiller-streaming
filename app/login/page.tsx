"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ChillerLogo } from "@/components/icons";
import { purgeAdScriptsAndElements } from "@/lib/ads/script-loader";

/**
 * Validates and sanitizes callbackUrl to completely eliminate Open Redirect vulnerabilities.
 * STRICT SECURITY:
 * - Only relative paths starting with a single '/' are permitted.
 * - Protocol-relative paths ('//'), backslashes ('/\'), schemes ('javascript:', 'http:'), and colons are rejected.
 */
function sanitizeCallbackUrl(rawUrl: string | null | undefined, isSuperAdmin: boolean): string {
  const defaultTarget = isSuperAdmin ? "/admin" : "/";
  if (!rawUrl || typeof rawUrl !== "string") {
    return defaultTarget;
  }

  const trimmed = rawUrl.trim();

  // Must begin with a single '/' and not with '//' or '/\'
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes(":") ||
    trimmed.includes("\\")
  ) {
    return defaultTarget;
  }

  // Whitelist safe internal path characters: alphanumeric, slash, hyphen, underscore, query, hash
  const isSafePath = /^\/[a-zA-Z0-9_\-\/?&=#%]*$/.test(trimmed);
  if (!isSafePath) {
    return defaultTarget;
  }

  return trimmed;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Isolate sensitive authentication view: immediately purge any external scripts
  useEffect(() => {
    purgeAdScriptsAndElements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email address or password.");
      } else {
        // Merge guest localStorage watchlist into account
        try {
          const guestWatchlist = localStorage.getItem("chiller_watchlist");
          if (guestWatchlist) {
            const items = JSON.parse(guestWatchlist);
            if (Array.isArray(items) && items.length > 0) {
              await fetch("/api/user/watchlist/merge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
              });
              localStorage.removeItem("chiller_watchlist");
            }
          }
        } catch {
          // Non-blocking
        }

        const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const rawCallback = searchParams?.get("callbackUrl");

        const normalizedEmail = email.trim().toLowerCase();
        const isSuperAdmin =
          normalizedEmail === "roytejaswi40@gmail.com" ||
          normalizedEmail === "roytejaswi206@gmail.com";

        // Strictly sanitize redirect target — prevent open redirect
        const safeDestination = sanitizeCallbackUrl(rawCallback, isSuperAdmin);

        // Full window navigation ensures cookies are committed and server components render authenticated state
        window.location.href = safeDestination;
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#09090C]">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FF3B6B]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-center mb-6">
          <ChillerLogo className="w-12 h-12" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white text-center tracking-tight mb-2">
          Sign In to CHILLER
        </h1>
        <p className="text-xs text-zinc-400 text-center mb-6">
          Synchronize your personalized watchlist, streaming progress, and playback preferences across all devices.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-4 text-center">
            {error}
          </div>
        )}

        <form method="POST" action="#" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Email Address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-1 focus:ring-[#FF3B6B] transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold text-[#FF3B6B] hover:text-[#FF3B6B]/80 transition"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-1 focus:ring-[#FF3B6B] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#FF3B6B]/30 hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-xs text-center text-zinc-400">
          Don't have a CHILLER account?{" "}
          <Link href="/register" className="text-[#FF3B6B] hover:text-[#FF3B6B]/80 font-semibold underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
