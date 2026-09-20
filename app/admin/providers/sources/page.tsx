"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { IconCheck } from "@/components/icons";

interface MappedSource {
  id: string;
  mediaKey: string;
  providerId: string;
  providerName: string;
  providerCategory?: string;
  providerMediaId: string;
  title?: string | null;
  season?: number | null;
  episode?: number | null;
  quality?: string | null;
  format?: string | null;
  status: string;
  expiresAt?: string | null;
  isExpired?: boolean;
  createdAt: string;
}

const PROVIDERS = [
  { id: "filemoon", name: "FileMoon", category: "Video Host / HLS" },
  { id: "vdohide", name: "VdoHide", category: "HLS Video Host" },
  { id: "streamtape", name: "StreamTape", category: "Video Host" },
  { id: "dailymotion", name: "Dailymotion", category: "Web Player v2" },
  { id: "jellyfin", name: "Jellyfin", category: "Self-Hosted HLS" },
  { id: "plex", name: "Plex", category: "Self-Hosted" },
  { id: "earnvids", name: "EarnVids", category: "Video Service" },
  { id: "vidstream", name: "Vidstream", category: "Streaming Host" },
  { id: "vidstreaming", name: "VidStreaming", category: "Video Host" },
  { id: "mycloud", name: "MyCloud", category: "Cloud Embed" },
  { id: "megacloud", name: "MegaCloud", category: "Cloud Embed" },
  { id: "megaup", name: "MegaUp", category: "Video Host" },
  { id: "tubi", name: "Tubi", category: "AVOD Platform" },
  { id: "roku", name: "The Roku Channel", category: "FAST Platform" },
  { id: "pluto", name: "Pluto TV", category: "FAST Platform" },
];

export default function AdminSourceMappingPage() {
  const [sources, setSources] = useState<MappedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testEmbedUrl, setTestEmbedUrl] = useState<string | null>(null);

  // Form state
  const [mediaType, setMediaType] = useState<"movie" | "tv" | "anime">("movie");
  const [mediaId, setMediaId] = useState("");
  const [title, setTitle] = useState("");
  const [season, setSeason] = useState("");
  const [episode, setEpisode] = useState("");
  const [providerId, setProviderId] = useState("filemoon");
  const [providerMediaId, setProviderMediaId] = useState("");
  const [quality, setQuality] = useState("1080p HD");
  const [format, setFormat] = useState("EMBED");
  const [status, setStatus] = useState("ACTIVE");
  const [expiresAt, setExpiresAt] = useState("");

  const loadSources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/providers/sources");
      if (res.ok) {
        const json = await res.json();
        setSources(json.sources || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaId || !providerMediaId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/providers/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType,
          tmdbId: mediaType !== "anime" ? mediaId : undefined,
          anilistId: mediaType === "anime" ? mediaId : undefined,
          title,
          season: season ? parseInt(season, 10) : undefined,
          episode: episode ? parseInt(episode, 10) : undefined,
          providerId,
          providerMediaId,
          quality,
          format,
          status,
          expiresAt: expiresAt || undefined,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        // Reset form
        setMediaId("");
        setTitle("");
        setSeason("");
        setEpisode("");
        setProviderMediaId("");
        loadSources();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to create source mapping");
      }
    } catch (err: any) {
      alert(err.message || "Connection error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this provider source mapping?")) return;
    try {
      const res = await fetch(`/api/admin/providers/sources?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      alert("Failed to delete mapping");
    }
  };

  const filteredSources = sources.filter((s) => {
    const matchesSearch =
      !filterSearch ||
      s.mediaKey.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (s.title && s.title.toLowerCase().includes(filterSearch.toLowerCase())) ||
      s.providerMediaId.toLowerCase().includes(filterSearch.toLowerCase());
    const matchesProvider = !filterProvider || s.providerId.toLowerCase() === filterProvider.toLowerCase();
    return matchesSearch && matchesProvider;
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/providers"
              className="text-xs text-zinc-500 hover:text-white transition font-medium"
            >
              ← Providers
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
              Source Directory
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Authorized Source Mapping
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Link TMDB / AniList media identity to authorized FileMoon, VdoHide, StreamTape, or Jellyfin sources.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/playback-lab"
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 transition"
          >
            🧪 Playback Lab
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-xs font-bold text-white shadow-lg shadow-[#FF3B6B]/20 transition cursor-pointer"
          >
            + Map New Source
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Filter by mediaKey, title, or file code..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#12121a] border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF3B6B]"
        />
        <select
          value={filterProvider}
          onChange={(e) => setFilterProvider(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-[#12121a] border border-white/10 text-xs text-white focus:outline-none focus:border-[#FF3B6B]"
        >
          <option value="">All Providers</option>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          onClick={loadSources}
          className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
        >
          ↻
        </button>
      </div>

      {/* Sources Table */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 font-medium text-xs">
          Loading mapped sources...
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-dashed border-white/10 bg-[#12121a]/50">
          <p className="text-zinc-400 font-medium text-sm">No source mappings found</p>
          <p className="text-zinc-600 text-xs mt-1">
            Map your first media source using the &quot;+ Map New Source&quot; button above.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#12121a]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-mono text-[10px] uppercase">
                <th className="py-3 px-4">Media Target</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Provider Media ID / Stream</th>
                <th className="py-3 px-4">Quality & Format</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSources.map((source) => {
                const isHls = source.format === "HLS" || source.providerMediaId.includes(".m3u8");
                return (
                  <tr key={source.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-white text-xs">
                        {source.title || source.mediaKey}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {source.mediaKey}
                        {source.season && ` (S${source.season}E${source.episode || 1})`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-zinc-300">
                        {source.providerName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300 max-w-[240px] truncate">
                      <span title={source.providerMediaId}>{source.providerMediaId}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#FF3B6B]/10 text-[#FF3B6B] border border-[#FF3B6B]/20">
                          {source.quality || "1080p"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {isHls ? "HLS" : "EMBED"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {source.isExpired ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          EXPIRED
                        </span>
                      ) : source.status === "ACTIVE" ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-zinc-800 text-zinc-500">
                          {source.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            let preview = source.providerMediaId;
                            if (!preview.startsWith("http")) {
                              if (source.providerId === "filemoon") preview = `https://filemoon.org/e/${preview}`;
                              else if (source.providerId === "streamtape") preview = `https://streamtape.com/e/${preview}`;
                              else if (source.providerId === "vdohide") preview = `https://vdohide.com/e/${preview}`;
                            }
                            setTestEmbedUrl(preview);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] font-semibold transition cursor-pointer"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleDelete(source.id)}
                          className="p-1 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                          title="Delete Mapping"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add New Mapping Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Map Authorized Provider Source</h3>
                <p className="text-xs text-zinc-400">Associate TMDB/AniList title with provider media ID</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMapping} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Media Type</label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#FF3B6B]"
                  >
                    <option value="movie">Movie</option>
                    <option value="tv">TV Show</option>
                    <option value="anime">Anime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    {mediaType === "anime" ? "AniList ID" : "TMDB ID"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={mediaType === "movie" ? "e.g. 550 (Fight Club)" : "e.g. 1399"}
                    value={mediaId}
                    onChange={(e) => setMediaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF3B6B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Title (Optional label)</label>
                <input
                  type="text"
                  placeholder="e.g. Fight Club (1999)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF3B6B]"
                />
              </div>

              {mediaType !== "movie" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">Season #</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF3B6B]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">Episode #</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={episode}
                      onChange={(e) => setEpisode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF3B6B]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Target Provider</label>
                  <select
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#FF3B6B]"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#FF3B6B]"
                  >
                    <option value="EMBED">Embed / Iframe</option>
                    <option value="HLS">HLS Stream (.m3u8)</option>
                    <option value="MP4">Direct MP4</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Provider Media ID / Code / URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. file code 'abcd1234efgh' or full URL"
                  value={providerMediaId}
                  onChange={(e) => setProviderMediaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-zinc-600 font-mono focus:outline-none focus:border-[#FF3B6B]"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  For FileMoon, VdoHide, or StreamTape, enter the alphanumeric file code or the direct embed/HLS URL.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Quality</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#FF3B6B]"
                  >
                    <option value="1080p HD">1080p HD</option>
                    <option value="4K UHD">4K UHD</option>
                    <option value="720p HD">720p HD</option>
                    <option value="Original (Direct)">Original (Direct)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#FF3B6B]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="UNVERIFIED">UNVERIFIED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold shadow-lg shadow-[#FF3B6B]/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving Mapping..." : "Save Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {testEmbedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#12121a] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 truncate max-w-xl">
                {testEmbedUrl}
              </span>
              <button
                onClick={() => setTestEmbedUrl(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
              <iframe
                src={testEmbedUrl}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
