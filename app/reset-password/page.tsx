"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ChillerLogo } from "@/components/icons";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialToken = searchParams.get("token") || "";

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl">
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FF3B6B]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-center mb-6">
        <ChillerLogo className="w-12 h-12" />
      </div>

      <h1 className="text-xl sm:text-2xl font-black text-white text-center tracking-tight mb-2">
        Set New Password
      </h1>
      <p className="text-xs text-zinc-400 text-center mb-6">
        Create a new, secure password for your Chiller account.
      </p>

      {success ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center leading-relaxed">
            Your password has been successfully reset! You can now log in with your new credentials.
          </div>
          <Link
            href="/login"
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-xs sm:text-sm font-bold text-center shadow-lg shadow-[#FF3B6B]/30 hover:opacity-95 transition"
          >
            Sign In Now
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          {!initialToken && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Reset Token
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter reset token"
                className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-1 focus:ring-[#FF3B6B] transition"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-1 focus:ring-[#FF3B6B] transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-1 focus:ring-[#FF3B6B] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#FF3B6B]/30 hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#09090C]">
      <Suspense fallback={<div className="text-zinc-500 text-xs">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
