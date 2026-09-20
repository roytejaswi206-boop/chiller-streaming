"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ChillerLogo } from "@/components/icons";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Automatically sign in
      const signInRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        router.push("/login");
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

        router.push("/");
        router.refresh();
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
          Create Chiller Account
        </h1>
        <p className="text-xs text-zinc-400 text-center mb-6">
          Join Chiller to save your list, track watch progress, and stream across devices.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or alias"
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-1 focus:ring-[#FF3B6B] transition"
            />
          </div>

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

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-1 focus:ring-[#FF3B6B] transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-1 focus:ring-[#FF3B6B] transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#FF3B6B]/30 hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-xs text-center text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-[#FF3B6B] hover:text-[#FF3B6B]/80 font-semibold underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
