"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ForceChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password.");
        return;
      }

      setSuccess(true);
      // Sign out and force re-login with new credentials
      setTimeout(async () => {
        await signOut({ callbackUrl: "/login?msg=password_changed" });
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090C] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF3B6B] to-[#8A5CFF] mb-4 shadow-xl shadow-[#FF3B6B]/20">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Secure Your Account
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-xs mx-auto">
            A temporary password was used to access this account. You must set a
            new private password to continue.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl space-y-5"
        >
          {/* Security notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 font-medium">
            🔒 For security, your session will end after this change. Log back in
            with your new password.
          </div>

          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
              Current / Temporary Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your temporary password"
              className="w-full h-11 px-4 rounded-xl bg-[#09090C] border border-white/15 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF3B6B] transition"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              className="w-full h-11 px-4 rounded-xl bg-[#09090C] border border-white/15 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF3B6B] transition"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repeat new password"
              className="w-full h-11 px-4 rounded-xl bg-[#09090C] border border-white/15 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF3B6B] transition"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-medium">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-bold">
              ✅ Password changed! Signing you out…
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white font-bold text-sm hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-[#FF3B6B]/20 cursor-pointer"
          >
            {isLoading ? "Saving…" : success ? "Done!" : "Set New Password"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600 mt-4">
          Need help?{" "}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-zinc-400 hover:text-white transition underline underline-offset-2 cursor-pointer"
          >
            Sign out and try again
          </button>
        </p>
      </div>
    </div>
  );
}
