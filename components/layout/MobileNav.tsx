"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconMovie,
  IconSeries,
  IconAnime,
  IconSearch,
  IconUser,
} from "@/components/icons";

export function MobileNav() {
  const pathname = usePathname();

  // Hide on admin, embed, and watch routes to avoid interfering with playback controls (Sections 5, 7, 62)
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/embed") ||
    pathname.startsWith("/watch")
  ) {
    return null;
  }

  const navItems = [
    { label: "Home", href: "/", icon: IconHome },
    { label: "Movies", href: "/movies", icon: IconMovie },
    { label: "Series", href: "/series", icon: IconSeries },
    { label: "Anime", href: "/anime", icon: IconAnime },
    { label: "Search", href: "/search", icon: IconSearch },
    { label: "Profile", href: "/profile", icon: IconUser },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2px)" }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden min-h-[3.75rem] bg-[#09090C]/95 border-t border-white/10 px-2 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.85)] touch-manipulation select-none"
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`relative flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1.5 rounded-xl transition-all duration-100 touch-manipulation tap-instant ${
              isActive
                ? "text-[#FF3B6B]"
                : "text-zinc-400 hover:text-zinc-200 active:scale-95"
            }`}
          >
            {isActive && (
              <span className="absolute top-0.5 w-6 h-0.5 rounded-full bg-[#FF3B6B] shadow-[0_0_8px_#FF3B6B]" />
            )}
            <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                isActive ? "font-black text-[#FF3B6B]" : "font-medium"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

