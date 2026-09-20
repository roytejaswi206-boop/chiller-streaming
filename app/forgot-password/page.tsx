"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChillerLogo } from "@/components/icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
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
          Reset Password
        </h1>
        <p className="text-xs text-zinc-400 text-center mb-6">
          Enter your registered email address and we'll send you instructions to reset your password.
        </p>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center leading-relaxed">
              If an account with that email address exists in our system, password reset instructions have been dispatched. Please check your inbox.
            </div>
            <Link
              href="/login"
              className="block w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold text-center transition"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold text-center">
                {error}
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-1 focus:ring-[#FF3B6B] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#FF3B6B]/30 hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <p className="mt-4 text-xs text-center text-zinc-400">
              Remember your password?{" "}
              <Link href="/login" className="text-[#FF3B6B] hover:text-[#FF3B6B]/80 font-semibold underline">
                Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
