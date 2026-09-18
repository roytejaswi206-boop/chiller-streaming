import React from "react";
import Link from "next/link";
import { ChillerLogo } from "@/components/icons";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminNav = [
    { label: "API & Settings", href: "/admin/settings", icon: "⚙️" },
    { label: "System Logs", href: "/admin/logs", icon: "📜" },
    { label: "Videos (Local)", href: "/admin/videos", icon: "🎬" },
    { label: "Upload & Ingest", href: "/admin/upload", icon: "⬆️" },
    { label: "Folder Import", href: "/admin/import", icon: "📁" },
    { label: "Processing Queue", href: "/admin/processing", icon: "⚡" },
    { label: "Origin Servers", href: "/admin/servers", icon: "🖥️" },
    { label: "Storage", href: "/admin/storage", icon: "💾" },
    { label: "Telegram Ingestion", href: "/admin/telegram", icon: "✈️" },
    { label: "Analytics", href: "/admin/analytics", icon: "📈" },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      {/* Admin Sidebar */}
      <aside className="w-60 shrink-0 hidden md:flex flex-col justify-between py-6 px-3 border-r border-white/10 bg-[#0F172A]">
        <div className="space-y-6">
          <div className="px-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20 px-2 py-0.5 rounded">
              CHILLER ADMIN
            </span>
            <h2 className="text-sm font-bold text-white mt-1">Control Center</h2>
          </div>

          <nav className="space-y-1">
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
