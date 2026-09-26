import React from "react";
import Link from "next/link";
import { ChillerLogo } from "@/components/icons";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminNav = [
    { label: "Dashboard", href: "/admin", icon: "📊" },
    { label: "Root Security Authority", href: "/admin/security", icon: "🛡️" },
    { label: "Intelligence & Routing Brain", href: "/admin/intelligence", icon: "🧠" },
    { label: "Providers Center", href: "/admin/providers", icon: "🔌" },
    { label: "Anime Playback Lab", href: "/admin/playback-lab/anime", icon: "⚔️" },
    { label: "General Playback Lab", href: "/admin/playback-lab/general", icon: "🎬" },
    { label: "Playback Verifier", href: "/admin/playback-test", icon: "▶️" },
    { label: "Diagnostics & Telemetry", href: "/admin/diagnostics", icon: "🛰️" },
    { label: "System Health", href: "/admin/health", icon: "🩺" },
    { label: "Cache Management", href: "/admin/cache", icon: "⚡" },
    { label: "User Management", href: "/admin/users", icon: "👥" },
    { label: "Audit Logs", href: "/admin/audit", icon: "📜" },
    { label: "Settings & Flags", href: "/admin/settings", icon: "⚙️" },
    { label: "Collections CMS", href: "/admin/collections", icon: "📚" },
    { label: "Homepage CMS", href: "/admin/homepage", icon: "🏠" },
    { label: "Search Analytics", href: "/admin/search-analytics", icon: "🔍" },
    { label: "Error Center", href: "/admin/errors", icon: "🚨" },
    { label: "Origin Servers", href: "/admin/servers", icon: "🖥️" },
    { label: "CDN Delivery & Edge", href: "/admin/cdn", icon: "🚀" },
    { label: "Storage & Transcoding", href: "/admin/storage", icon: "💾" },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-[#09090C]">
      {/* Mobile Super Admin Top Bar */}
      <div className="md:hidden border-b border-white/10 bg-[#0F172A] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20 px-2 py-0.5 rounded">
            SUPER ADMIN
          </span>
          <span className="text-xs font-bold text-white">Root Center</span>
        </div>
        <Link
          href="/"
          className="text-[11px] font-bold text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 bg-white/5"
        >
          ← Platform
        </Link>
      </div>

      {/* Admin Sidebar */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col justify-between py-6 px-3 border-r border-white/10 bg-[#0F172A]">
        <div className="space-y-6">
          <div className="px-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20 px-2 py-0.5 rounded">
                CHILLER SUPER ADMIN
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-sm font-bold text-white mt-1">Root Control Center</h2>
            <p className="text-[10px] text-zinc-400 mt-0.5">Authoritative Infrastructure</p>
          </div>

          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1 custom-scrollbar">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="px-3 pt-4 border-t border-white/10">
          <Link
            href="/"
            className="block text-center py-2 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 transition"
          >
            ← Back to Platform
          </Link>
        </div>
      </aside>

      {/* Main Admin Content */}
      <div className="flex-1 p-4 lg:p-8 max-w-[1600px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}
