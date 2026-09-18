import React from "react";
import Link from "next/link";
import { ChillerLogo } from "@/components/icons";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.08] bg-[#09090C] text-zinc-400 text-xs mt-auto py-12 px-4 lg:px-12">
      <div className="max-w-[1680px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        {/* Brand & Slogan */}
        <div className="md:col-span-2 space-y-3">
          <ChillerLogo className="w-9 h-9" />
          <p className="text-sm font-semibold text-zinc-300">
            GOOD STORIES. BETTER DAYS.
          </p>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            A cinematic entertainment discovery and streaming platform bringing together movies, anime, TV series, and documentaries. Just chill and enjoy infinite stories.
          </p>
        </div>

        {/* Discovery Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
            Explore
          </h4>
          <ul className="space-y-2">
            <li>
              <Link href="/movies" className="hover:text-white transition">
                Movies
              </Link>
            </li>
            <li>
              <Link href="/anime" className="hover:text-white transition">
                Anime
              </Link>
            </li>
            <li>
              <Link href="/series" className="hover:text-white transition">
                TV Series
              </Link>
            </li>
            <li>
              <Link href="/trending" className="hover:text-white transition">
                Trending Now
              </Link>
            </li>
          </ul>
        </div>

        {/* Account & Info */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
            Platform
          </h4>
          <ul className="space-y-2">
            <li>
              <Link href="/watchlist" className="hover:text-white transition">
                My List
              </Link>
            </li>
            <li>
              <Link href="/history" className="hover:text-white transition">
                Watch History
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* TMDB Mandatory Attribution & Copyright */}
      <div className="max-w-[1680px] mx-auto pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} CHILLER. All rights reserved.</span>
        </div>

        {/* TMDB Mandatory Attribution Statement */}
        <div className="flex items-center gap-3 text-center sm:text-right text-zinc-400">
          <span className="inline-block px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] font-mono font-bold text-sky-400">
            TMDB
          </span>
          <span>
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </span>
        </div>
      </div>
    </footer>
  );
}
