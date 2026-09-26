import React from "react";
import Link from "next/link";
import { ChillerLogo } from "@/components/icons";
import { AdSmartLink } from "@/components/ads/AdSmartLink";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.08] bg-[#09090C] text-zinc-400 text-xs mt-auto pt-12 pb-24 md:pb-12 px-4 lg:px-12">
      <div className="max-w-[1680px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-10">
        {/* Brand & Slogan */}
        <div className="sm:col-span-2 space-y-3">
          <ChillerLogo className="w-9 h-9" />
          <p className="text-sm font-semibold text-zinc-300">
            GOOD STORIES. BETTER DAYS.
          </p>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            A cinematic entertainment discovery and streaming platform bringing together movies, anime, TV series, and documentaries. Just chill and enjoy infinite stories in high definition.
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
            <li>
              <Link href="/top-rated" className="hover:text-white transition">
                Top Rated
              </Link>
            </li>
            <li>
              <Link href="/new" className="hover:text-white transition">
                New Releases
              </Link>
            </li>
          </ul>
        </div>

        {/* Popular Genres */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
            Top Genres
          </h4>
          <ul className="space-y-2">
            <li>
              <Link href="/genre/action" className="hover:text-white transition">
                Action
              </Link>
            </li>
            <li>
              <Link href="/genre/scifi" className="hover:text-white transition">
                Sci-Fi
              </Link>
            </li>
            <li>
              <Link href="/genre/horror" className="hover:text-white transition">
                Horror
              </Link>
            </li>
            <li>
              <Link href="/genre/comedy" className="hover:text-white transition">
                Comedy
              </Link>
            </li>
            <li>
              <Link href="/genre/drama" className="hover:text-white transition">
                Drama
              </Link>
            </li>
            <li>
              <Link href="/genre/animation" className="hover:text-white transition">
                Animation
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Platform */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
            Platform
          </h4>
          <ul className="space-y-2">
            <li>
              <Link href="/categories" className="hover:text-white transition">
                All Categories
              </Link>
            </li>
            <li>
              <Link href="/trailers" className="hover:text-white transition">
                Movie Trailers
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

      {/* Sponsored Partner Recommendation (Supplied Ad Code 1) */}
      <AdSmartLink placement="footer_recommendation" />

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
