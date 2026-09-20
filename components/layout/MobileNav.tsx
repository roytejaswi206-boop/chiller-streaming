"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconSearch, IconPlus, IconUser } from "@/components/icons";

export function MobileNav() {
  const pathname = usePathname();

  // Hide on admin routes or embed routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/embed")) {
    return null;
  }

  const navItems = [
    { label: "Home", href: "/", icon: IconHome },
    { label: "Search", href: "/search", icon: IconSearch },
    { label: "My List", href: "/my-list", icon: IconPlus },
    { label: "Profile", href: "/profile", icon: IconUser },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden h-16 bg-[#09090C]/95 backdrop-blur-xl border-t border-white/10 px-4 flex items-center justify-around">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              isActive ? "text-[#FF3B6B]" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
