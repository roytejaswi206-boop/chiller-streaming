"use client";

import React, { useState, useEffect } from "react";

interface HomepageRailConfig {
  id?: string;
  title: string;
  queryJson?: string;
  enabled: boolean;
  order: number;
  layout?: string;
  badge?: string | null;
}

export default function AdminHomepageBuilderPage() {
  const [sections, setSections] = useState<HomepageRailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadSections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/homepage");
      if (res.ok) {
        const json = await res.json();
        setSections(json.sections || []);
      }
    } catch {
      setStatusMsg({ text: "Failed to load homepage rails from server.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const toggleSection = (index: number) => {
    setSections((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setSections(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setSections(data.sections);
      setStatusMsg({ text: "✓ Homepage configuration saved and published to production.", type: "success" });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: `Save error: ${err.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
            Layout CMS
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Homepage Rail Builder
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Reorder, enable, disable, and customize Discovery rails on the public Home page with database persistence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSections}
            disabled={loading || saving}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition cursor-pointer"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25 cursor-pointer disabled:opacity-50"
          >
            {saving ? "Publishing..." : "Publish Order"}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === "success"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
          }`}
        >
          <span>{statusMsg.type === "success" ? "✓" : "⚠️"}</span>
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>Rail Configuration ({sections.length} Active Rails)</span>
          <span>Order & Status Controls</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs">Loading homepage layout from database...</div>
        ) : (
          <div className="divide-y divide-white/5">
            {sections.map((section, idx) => (
              <div
                key={section.id || idx}
                className={`p-4 flex items-center justify-between gap-4 transition ${
                  section.enabled ? "bg-transparent" : "bg-black/30 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs font-mono text-zinc-500 font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{section.title}</span>
                      {section.badge && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30">
                          {section.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      Layout: {section.layout || "poster"} • Order Index: {idx + 1}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveSection(idx, "up")}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 cursor-pointer text-xs"
                    title="Move Up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveSection(idx, "down")}
                    disabled={idx === sections.length - 1}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 cursor-pointer text-xs"
                    title="Move Down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => toggleSection(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      section.enabled
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {section.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
