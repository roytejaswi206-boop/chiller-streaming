"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAnime,
  IconClock,
  IconHeart,
  IconHome,
  IconMovie,
  IconPlus,
  IconSeries,
  IconSettings,
  IconTrending,
  IconUser,
} from "@/components/icons";

export function Sidebar() {
  const pathname = usePathname();

  const mainNav = [
    { label: "Home", href: "/", icon: IconHome },
    { label: "Movies", href: "/movies", icon: IconMovie },
    { label: "Anime", href: "/anime", icon: IconAnime },
    { label: "Series", href: "/series", icon: IconSeries },
    { label: "Trending", href: "/trending", icon: IconTrending },
    { label: "My List", href: "/watchlist", icon: IconPlus },
  ];

  const secondaryNav = [
    { label: "History", href: "/history", icon: IconClock },
    { label: "Settings", href: "/admin/settings", icon: IconSettings },
    { label: "Profile", href: "/profile", icon: IconUser },
  ];

  return (
    <aside className="w-56 shrink-0 hidden lg:flex flex-col justify-between py-6 px-3 border-r border-white/[0.08] bg-[#09090C] min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Main Navigation */}
        <div className="space-y-1.5">
          {mainNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs transition duration-150 ${
                  isActive
                    ? "bg-[#FF3B6B]/15 border-l-2 border-[#FF3B6B] text-white font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-[#FF3B6B]" : "text-zinc-400 group-hover:text-white"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Discovery & Genres */}
        <div className="pt-4 border-t border-white/[0.06]">
          <p className="px-3.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
            Browse Genres
          </p>
          <div className="grid grid-cols-2 gap-1 px-1">
            {[
              { label: "Action", href: "/genre/action" },
              { label: "Comedy", href: "/genre/comedy" },
              { label: "Drama", href: "/genre/drama" },
              { label: "Sci-Fi", href: "/genre/scifi" },
              { label: "Horror", href: "/genre/horror" },
              { label: "Romance", href: "/genre/romance" },
              { label: "Thriller", href: "/genre/thriller" },
              { label: "Documentary", href: "/genre/documentary" },
            ].map((g) => {
              const isActive = pathname === g.href;
              return (
                <Link
                  key={g.label}
                  href={g.href}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
                    isActive
                      ? "bg-[#FF3B6B]/20 text-white font-bold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  {g.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Library / Account Section */}
        <div className="pt-4 border-t border-white/[0.06]">
          <p className="px-3.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
            Library & Account
          </p>
          <div className="space-y-1">
            {secondaryNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-xs transition duration-150 ${
                    isActive
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium"
                  }`}
                >
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Brand Aesthetic Card matching visual reference */}
      <div className="mt-8 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0F172A] to-[#09090C] p-4 text-center relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF3B6B]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#8A5CFF]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF3B6B] to-[#8A5CFF] text-white flex items-center justify-center mx-auto mb-2 text-xs font-black shadow-lg shadow-[#FF3B6B]/20">
          C
        </div>

        <h4 className="text-xs font-black text-white tracking-wide mb-1">
          CHILLER
        </h4>
        <p className="text-[10px] text-zinc-400 mb-2.5 font-medium">
          JUST CHILL.
        </p>

        <span className="inline-block px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[9px] font-bold text-zinc-300">
          Powered by TMDB
        </span>

        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/intro";
            }
          }}
          className="mt-3 w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-[#FF3B6B]/20 to-[#8A5CFF]/20 hover:from-[#FF3B6B]/30 hover:to-[#8A5CFF]/30 border border-[#FF3B6B]/30 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>🎬</span>
          <span>Replay Intro</span>
        </button>
      </div>
    </aside>
  );
}
