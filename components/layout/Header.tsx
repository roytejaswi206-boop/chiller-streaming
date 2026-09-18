"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ChillerLogo, IconMoon, IconSearch } from "@/components/icons";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Movies", href: "/movies" },
    { label: "Anime", href: "/anime" },
    { label: "Series", href: "/series" },
    { label: "Trending", href: "/trending" },
    { label: "My List", href: "/watchlist" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-white/[0.08] bg-[#09090C]/90 backdrop-blur-xl px-4 lg:px-8 flex items-center justify-between gap-4">
      {/* Brand Logo & Main Navigation */}
      <div className="flex items-center gap-8">
        <Link href="/">
          <ChillerLogo className="w-8 h-8" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1 transition ${
                  isActive
                    ? "text-white font-bold"
                    : "text-zinc-400 hover:text-white font-medium"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 rounded-full bg-[#FF3B6B]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Center Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
        <div className="relative flex items-center">
          <IconSearch className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search movies, anime, series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-full bg-[#0F172A] border border-white/10 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B] focus:ring-1 focus:ring-[#FF3B6B] transition"
          />
        </div>
      </form>

      {/* Right Utilities */}
      <div className="flex items-center gap-3">
        {/* Mobile Search Button */}
        <Link
          href="/search"
          className="sm:hidden p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition"
        >
          <IconSearch className="w-5 h-5" />
        </Link>

        {/* Authentication Buttons or User Profile */}
        {session?.user ? (
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 py-1 px-2 rounded-full hover:bg-white/5 border border-white/10 transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#FF3B6B] to-[#8A5CFF] text-white font-bold text-xs flex items-center justify-center">
                {session.user.name ? session.user.name[0].toUpperCase() : "U"}
              </div>
              <span className="text-xs font-semibold text-zinc-200 hidden sm:inline max-w-[90px] truncate">
                {session.user.name || session.user.email}
              </span>
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div
                onMouseLeave={() => setUserDropdownOpen(false)}
                className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0F172A] p-1.5 shadow-2xl z-50 text-sm animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Signed in as</p>
                  <p className="font-semibold text-white truncate text-xs">
                    {session.user.email}
                  </p>
                </div>

                <Link
                  href="/watchlist"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition text-xs"
                >
                  My List
                </Link>
                <Link
                  href="/history"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition text-xs"
                >
                  Watch History
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition text-xs"
                >
                  Profile & Settings
                </Link>

                {(session.user as any).role === "ADMIN" && (
                  <Link
                    href="/admin/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#FF3B6B] hover:text-[#FF3B6B]/80 hover:bg-[#FF3B6B]/10 font-bold transition text-xs"
                  >
                    ⚡ API & Settings
                  </Link>
                )}

                <div className="h-px bg-white/[0.08] my-1" />

                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition text-xs font-semibold cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="py-1.5 px-4 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="py-1.5 px-4 rounded-full text-xs font-bold text-white bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 shadow-md shadow-[#FF3B6B]/20 transition"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
