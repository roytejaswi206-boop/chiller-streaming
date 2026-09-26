"use client";

import React, { useEffect, useState } from "react";
import { AdSettingsData } from "@/lib/ads/ad-types";
import { DEFAULT_AD_SETTINGS } from "@/lib/ads/config";
import { ResponsiveBannerAd } from "@/components/ads/ResponsiveBannerAd";
import { AdContainer } from "@/components/ads/AdContainer";

interface AnalyticsData {
  metrics: {
    todayCount: number;
    sevenDayCount: number;
    thirtyDayCount: number;
    totalUsers: number;
    adsFreeUsers: number;
    recentFailures: number;
  };
  byProvider: { provider: string; count: number }[];
  byPlacement: { placement: string; count: number }[];
  byDevice: { device: string; count: number }[];
}

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  tier: string;
  adsFree?: boolean;
}

export default function AdminAdsPage() {
  const [settings, setSettings] = useState<AdSettingsData>(DEFAULT_AD_SETTINGS);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Preview state
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // User search for Ad-Free accounts
  const [userSearch, setUserSearch] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<UserItem[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Load initial settings and analytics
  useEffect(() => {
    Promise.all([
      fetch("/api/ads/config").then((r) => (r.ok ? r.json() : DEFAULT_AD_SETTINGS)),
      fetch("/api/ads/impression").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([cfg, stats]) => {
        if (cfg) setSettings(cfg);
        if (stats) setAnalytics(stats);
      })
      .catch((err) => {
        setFeedback({ type: "error", message: "Failed to load ad configuration" });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggle = async (key: keyof AdSettingsData) => {
    const updatedValue = !settings[key];
    const newSettings = { ...settings, [key]: updatedValue };
    setSettings(newSettings);
    await saveSettings({ [key]: updatedValue });
  };

  const handleNumberChange = (key: keyof AdSettingsData, val: number) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const saveSettings = async (partialUpdates?: Partial<AdSettingsData>) => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const payload = partialUpdates || settings;
      const res = await fetch("/api/ads/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setSettings(data.settings);
      setFeedback({ type: "success", message: "Ad settings updated and published successfully." });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update ad configuration" });
    } finally {
      setIsSaving(false);
    }
  };

  // Search users for ad-free management
  const handleSearchUsers = async () => {
    if (!userSearch.trim()) return;
    setIsSearchingUsers(true);
    try {
      const res = await fetch("/api/admin/users?limit=50");
      if (res.ok) {
        const data = await res.json();
        const matches = (data.users || []).filter(
          (u: UserItem) =>
            u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
            (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase()))
        );
        setSearchedUsers(matches);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleToggleUserAdsFree = async (userId: string, currentVal: boolean) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, adsFree: !currentVal }),
      });
      if (res.ok) {
        setSearchedUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, adsFree: !currentVal } : u))
        );
        setFeedback({
          type: "success",
          message: `User ad-free status updated to ${!currentVal ? "EXEMPT (NO ADS)" : "STANDARD (ADS ENABLED)"}`,
        });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to update user ad-free status" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-zinc-400 text-sm animate-pulse">
        Loading Ad Monetization Engine...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header with Master Kill Switch */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
              CHILLER MONETIZATION
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                settings.adsEnabled
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-rose-400 bg-rose-500/10 border-rose-500/20"
              }`}
            >
              {settings.adsEnabled ? "SYSTEM ACTIVE" : "GLOBAL KILL SWITCH TRIGGERED"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Ad Monetization & Frequency Authority
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Control external advertising networks, govern frequency caps, preview responsive placements, and manage ad-free exemptions.
          </p>
        </div>

        {/* Global Master Kill Switch CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleToggle("adsEnabled")}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-2 ${
              settings.adsEnabled
                ? "bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
                : "bg-emerald-500 text-black hover:bg-emerald-400"
            }`}
          >
            <span>{settings.adsEnabled ? "🛑 Kill All Ads" : "▶️ Enable Ads Globally"}</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          <span>{feedback.type === "success" ? "✓" : "⚠️"} {feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/40">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Today</span>
          <span className="text-xl font-black text-white mt-1 block">
            {analytics?.metrics.todayCount ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400">Impressions</span>
        </div>
        <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/40">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">7-Day Volume</span>
          <span className="text-xl font-black text-white mt-1 block">
            {analytics?.metrics.sevenDayCount ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400">Past Week</span>
        </div>
        <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/40">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">30-Day Volume</span>
          <span className="text-xl font-black text-white mt-1 block">
            {analytics?.metrics.thirtyDayCount ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400">Past Month</span>
        </div>
        <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/40">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Users</span>
          <span className="text-xl font-black text-white mt-1 block">
            {analytics?.metrics.totalUsers ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400">Registered</span>
        </div>
        <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/40">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Ad-Free Accounts</span>
          <span className="text-xl font-black text-emerald-300 mt-1 block">
            {analytics?.metrics.adsFreeUsers ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400">Exempt</span>
        </div>
        <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/40">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Failures</span>
          <span className="text-xl font-black text-amber-300 mt-1 block">
            {analytics?.metrics.recentFailures ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400">Blocked / Timeout</span>
        </div>
      </div>

      {/* Main Grid: Controls & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Device & Page Controls */}
        <div className="space-y-6">
          {/* Device Delivery */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <span>📱</span> Device Delivery Channels
            </h2>
            <p className="text-[11px] text-zinc-400 mb-4">
              Disable advertising by target client viewport without affecting the other.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">Desktop Ads</span>
                  <span className="text-[10px] text-zinc-500">Leaderboard 728x90 & Invoke</span>
                </div>
                <button
                  onClick={() => handleToggle("desktopEnabled")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                    settings.desktopEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {settings.desktopEnabled ? "ENABLED" : "MUTED"}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">Mobile Ads</span>
                  <span className="text-[10px] text-zinc-500">Banner 320x50 Responsive</span>
                </div>
                <button
                  onClick={() => handleToggle("mobileEnabled")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                    settings.mobileEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {settings.mobileEnabled ? "ENABLED" : "MUTED"}
                </button>
              </div>
            </div>
          </div>

          {/* Page Routing Controls */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <span>🗺️</span> Section & Route Toggles
            </h2>
            <p className="text-[11px] text-zinc-400 mb-4">
              Toggle ad visibility across CHILLER's primary browsing routes.
            </p>
            <div className="space-y-2">
              {[
                { key: "homeEnabled", label: "Home Page (/)", desc: "Between hero and trending rails" },
                { key: "movieEnabled", label: "Movies (/movies)", desc: "Spaced content banner" },
                { key: "seriesEnabled", label: "Series (/series)", desc: "Spaced content banner" },
                { key: "animeEnabled", label: "Anime (/anime)", desc: "Spaced content banner" },
                { key: "detailEnabled", label: "Title Details", desc: "Below metadata / before Similar" },
                { key: "watchEnabled", label: "Watch / Player Page", desc: "Strictly below player (never over)" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="text-xs font-semibold text-zinc-300 block">{label}</span>
                    <span className="text-[10px] text-zinc-500">{desc}</span>
                  </div>
                  <button
                    onClick={() => handleToggle(key as keyof AdSettingsData)}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase transition ${
                      settings[key as keyof AdSettingsData]
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    {settings[key as keyof AdSettingsData] ? "ON" : "OFF"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Providers & Placements */}
        <div className="space-y-6">
          {/* Provider Network Switches */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <span>📡</span> Integrated Provider Networks
            </h2>
            <p className="text-[11px] text-zinc-400 mb-4">
              Verified ad networks supplied by site owner with automatic circuit breakers.
            </p>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Profitablerate CPM Network</span>
                  <button
                    onClick={() => handleToggle("providerProfitableRate")}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                      settings.providerProfitableRate ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    {settings.providerProfitableRate ? "ON" : "OFF"}
                  </button>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  Network script + Invoke container (pl31522715 & pl31522716)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">HighRevenueFormat 320x50</span>
                  <button
                    onClick={() => handleToggle("providerHighRevenue320")}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                      settings.providerHighRevenue320 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    {settings.providerHighRevenue320 ? "ON" : "OFF"}
                  </button>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  Key: 68c3e3bd... (Mobile isolated iframe)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">HighRevenueFormat 728x90</span>
                  <button
                    onClick={() => handleToggle("providerHighRevenue728")}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                      settings.providerHighRevenue728 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    {settings.providerHighRevenue728 ? "ON" : "OFF"}
                  </button>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  Key: b541512a... (Desktop/Tablet isolated iframe)
                </span>
              </div>
            </div>
          </div>

          {/* Placement Slots */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <span>🎯</span> Placement Slots
            </h2>
            <p className="text-[11px] text-zinc-400 mb-4">
              Toggle specific slot types across templates.
            </p>
            <div className="space-y-2">
              {[
                { key: "topBannerEnabled", label: "Top Banner", desc: "Below Hero on Homepage" },
                { key: "contentBannerEnabled", label: "Content Banner", desc: "Between rail intervals on browse" },
                { key: "detailBannerEnabled", label: "Detail Bottom Banner", desc: "Before similar recommendations" },
                { key: "playerBannerEnabled", label: "Below Player Banner", desc: "Strictly below video player" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="text-xs font-semibold text-zinc-300 block">{label}</span>
                    <span className="text-[10px] text-zinc-500">{desc}</span>
                  </div>
                  <button
                    onClick={() => handleToggle(key as keyof AdSettingsData)}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                      settings[key as keyof AdSettingsData]
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    {settings[key as keyof AdSettingsData] ? "ON" : "OFF"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Frequency & Throttling */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <span>⏱️</span> Smart Frequency & Throttling
            </h2>
            <p className="text-[11px] text-zinc-400 mb-4">
              Guarantees infrequent, respectful exposure so CHILLER remains premium.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Initial Page Delay (seconds)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={settings.initialPageAdDelay}
                    onChange={(e) => handleNumberChange("initialPageAdDelay", parseInt(e.target.value) || 0)}
                    className="w-24 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <span className="text-[10px] text-zinc-500">Wait time before 1st ad</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Minimum Ad Interval (seconds)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={600}
                    value={settings.minIntervalSeconds}
                    onChange={(e) => handleNumberChange("minIntervalSeconds", parseInt(e.target.value) || 0)}
                    className="w-24 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <span className="text-[10px] text-zinc-500">Cooldown between impressions</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Session Maximum Impressions
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={settings.sessionLimit}
                    onChange={(e) => handleNumberChange("sessionLimit", parseInt(e.target.value) || 0)}
                    className="w-24 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <span className="text-[10px] text-zinc-500">Max per user session</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Page Maximum Impressions
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={settings.pageLimit}
                    onChange={(e) => handleNumberChange("pageLimit", parseInt(e.target.value) || 0)}
                    className="w-24 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <span className="text-[10px] text-zinc-500">Max on browse/home</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Player Page Maximum (Strict)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={2}
                    value={settings.playerPageLimit}
                    onChange={(e) => handleNumberChange("playerPageLimit", parseInt(e.target.value) || 0)}
                    className="w-24 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <span className="text-[10px] text-zinc-500">Max on /watch routes</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Content Item Spacing
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={settings.contentSpacing}
                    onChange={(e) => handleNumberChange("contentSpacing", parseInt(e.target.value) || 0)}
                    className="w-24 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <span className="text-[10px] text-zinc-500">Items between ads in grids</span>
                </div>
              </div>

              <button
                onClick={() => saveSettings()}
                disabled={isSaving}
                className="w-full mt-2 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white transition flex items-center justify-center gap-2"
              >
                {isSaving ? "Saving..." : "Save Frequency Rules"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Friends & Test Accounts Ad-Free Governance */}
      <div className="p-6 rounded-2xl border border-white/10 bg-[#12121a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🛡️</span> Ad-Free Account Management (Friends & Testers)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Super Admins are automatically exempt. Mark any specific account as Ad-Free to immediately disable all ads for that user.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search user by email or name..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
              className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 w-64"
            />
            <button
              onClick={handleSearchUsers}
              disabled={isSearchingUsers}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/10 transition"
            >
              {isSearchingUsers ? "..." : "Search"}
            </button>
          </div>
        </div>

        {searchedUsers.length > 0 && (
          <div className="border border-white/5 rounded-xl overflow-hidden mt-3">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-zinc-400 text-[10px] font-bold uppercase border-b border-white/5">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Ad-Free Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {searchedUsers.map((u) => {
                  const isSuperAdmin = u.role === "SUPER_ADMIN";
                  const isAdFree = isSuperAdmin || Boolean(u.adsFree);
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white">
                        {u.name || "User"} <span className="text-zinc-500 font-mono text-[11px]">({u.email})</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5">{u.role}</span>
                      </td>
                      <td className="p-3 text-zinc-400 font-mono">{u.tier}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isAdFree ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-500"
                          }`}
                        >
                          {isAdFree ? "ZERO ADS" : "STANDARD"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {isSuperAdmin ? (
                          <span className="text-[10px] text-zinc-500 italic">Protected Super Admin</span>
                        ) : (
                          <button
                            onClick={() => handleToggleUserAdsFree(u.id, Boolean(u.adsFree))}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border transition ${
                              isAdFree
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                            }`}
                          >
                            {isAdFree ? "Revoke Ad-Free" : "Grant Ad-Free"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Placement Preview Simulator */}
      <div className="p-6 rounded-2xl border border-white/10 bg-[#12121a]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>👁️</span> Live Placement Preview Simulator
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Inspect how the responsive ad container renders on desktop versus mobile viewports.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setPreviewDevice("desktop")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                previewDevice === "desktop" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              Desktop (728x90)
            </button>
            <button
              onClick={() => setPreviewDevice("mobile")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                previewDevice === "mobile" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              Mobile (320x50)
            </button>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-white/5 bg-black/60 flex items-center justify-center overflow-x-auto">
          <div
            className={`transition-all duration-300 flex flex-col items-center justify-center ${
              previewDevice === "mobile" ? "w-[360px] border border-white/10 rounded-2xl p-4 bg-zinc-950" : "w-full max-w-4xl"
            }`}
          >
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Simulated {previewDevice.toUpperCase()} Container
            </span>
            <AdContainer placement="home_top" minHeight={previewDevice === "mobile" ? 50 : 90}>
              <ResponsiveBannerAd />
            </AdContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
