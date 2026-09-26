import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { ChillerLogo, IconHome, IconMovie, IconSeries, IconTrending } from "@/components/icons";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  description: "The page you are looking for does not exist on CHILLER. Browse trending movies, series, and anime.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-[#09090C] text-[#F8FAFC]">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0F172A] p-8 sm:p-12 text-center shadow-2xl overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FF3B6B]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-center mb-6">
          <ChillerLogo className="w-14 h-14" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20 mb-3">
          Error 404
        </span>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
          Page Not Found
        </h1>

        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-8">
          The title, episode, or page you were looking for has moved, expired, or doesn't exist.
          Don't worry — there are thousands of great stories waiting for you.
        </p>

        <section aria-label="Suggested Destinations" className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Explore CHILLER
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Link
              href="/"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-[#FF3B6B]/40 transition group"
            >
              <span className="text-xs font-bold text-white group-hover:text-[#FF3B6B] transition">
                Home
              </span>
            </Link>

            <Link
              href="/movies"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-[#FF3B6B]/40 transition group"
            >
              <IconMovie className="w-4 h-4 mb-1 text-zinc-400 group-hover:text-[#FF3B6B] transition" />
              <span className="text-xs font-bold text-white group-hover:text-[#FF3B6B] transition">
                Movies
              </span>
            </Link>

            <Link
              href="/series"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-[#FF3B6B]/40 transition group"
            >
              <IconSeries className="w-4 h-4 mb-1 text-zinc-400 group-hover:text-[#FF3B6B] transition" />
              <span className="text-xs font-bold text-white group-hover:text-[#FF3B6B] transition">
                Series
              </span>
            </Link>

            <Link
              href="/trending"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-[#FF3B6B]/40 transition group"
            >
              <IconTrending className="w-4 h-4 mb-1 text-zinc-400 group-hover:text-[#FF3B6B] transition" />
              <span className="text-xs font-bold text-white group-hover:text-[#FF3B6B] transition">
                Trending
              </span>
            </Link>
          </div>

          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF3B6B] to-[#8A5CFF] text-white text-xs font-bold shadow-lg shadow-[#FF3B6B]/30 hover:opacity-95 transition"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
