"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ChillerLogo } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillAdmin = () => {
    setEmail("admin@chiller.com");
    setPassword("Admin@123456");
  };

  const fillMember = () => {
    setEmail("user@chiller.com");
    setPassword("User@123456");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#09090C]">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FF3B6B]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-center mb-6">
          <ChillerLogo className="w-12 h-12" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white text-center tracking-tight mb-2">
          Welcome to Chiller
        </h1>
        <p className="text-xs text-zinc-400 text-center mb-6">
          Sign in to synchronize your watchlist, history, and preferences across devices.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3864] focus:ring-1 focus:ring-[#FF3864] transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3864] focus:ring-1 focus:ring-[#FF3864] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl velora-gradient text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/30 hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Quick Demo Credentials Fill Buttons */}
        <div className="mt-6 pt-5 border-t border-white/[0.08]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center mb-2.5">
            Quick Test Logins
          </p>
          <div className="flex gap-2">
            <button
              onClick={fillAdmin}
              className="flex-1 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-rose-300 transition cursor-pointer"
            >
              Admin Demo
            </button>
            <button
              onClick={fillMember}
              className="flex-1 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-zinc-300 transition cursor-pointer"
            >
              Member Demo
            </button>
          </div>
        </div>

        <p className="mt-6 text-xs text-center text-zinc-400">
          Don't have an account?{" "}
          <Link href="/register" className="text-rose-400 hover:text-rose-300 font-semibold underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
