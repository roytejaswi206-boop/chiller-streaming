"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface CollectionData {
  id: string;
  title: string;
  slug: string;
  description?: string;
  active: boolean;
  featured: boolean;
  _count?: { items: number };
}

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/collections");
      if (res.ok) {
        const json = await res.json();
        setCollections(json.collections || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setActionSuccess("");
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, description }),
      });
      const data = await res.json();
      if (res.ok) {
        setTitle("");
        setSlug("");
        setDescription("");
        setCreating(false);
        setActionSuccess("✓ Collection created and published.");
        setTimeout(() => setActionSuccess(""), 4000);
        loadCollections();
      } else {
        setErrorMsg(data.error || "Failed to create collection.");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleTogglePublish = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !currentActive }),
      });
      if (res.ok) {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, active: !currentActive } : c))
        );
      }
    } catch {
      // Ignore
    }
  };

  const handleDelete = async (id: string, colTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete collection "${colTitle}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/collections?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCollections((prev) => prev.filter((c) => c.id !== id));
        setActionSuccess(`✓ Collection "${colTitle}" deleted.`);
        setTimeout(() => setActionSuccess(""), 4000);
      }
    } catch {
      // Ignore
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
            Editorial CMS
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Collection Builder
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Create thematic curated collections with publish controls and real database persistence.
          </p>
        </div>

        <button
          onClick={() => setCreating(!creating)}
          className="px-4 py-2 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/20 cursor-pointer"
        >
          {creating ? "Cancel" : "+ New Collection"}
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
          {actionSuccess}
        </div>
      )}

      {creating && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-white/10 bg-[#12121a] p-6 space-y-4 max-w-xl shadow-2xl"
        >
          <h3 className="text-sm font-bold text-white">Create New Collection</h3>
          {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Collection Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Sci-Fi Masterpieces"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
              }}
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">URL Slug</label>
            <input
              type="text"
              required
              placeholder="e.g. sci-fi-masterpieces"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="A brief overview of this curated collection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-white text-xs font-bold transition shadow-lg shadow-[#FF3B6B]/25 cursor-pointer"
            >
              Save Collection
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-12 text-center text-zinc-500 font-medium text-xs">
          Loading collections...
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-12 text-center">
          <p className="text-zinc-400 text-xs font-semibold mb-2">No collections created yet.</p>
          <p className="text-zinc-600 text-xs">Click "+ New Collection" above to start curating.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((col) => (
            <div
              key={col.id}
              className="rounded-2xl border border-white/10 bg-[#12121a] p-5 space-y-3 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-white tracking-tight">{col.title}</h3>
                  <button
                    onClick={() => handleTogglePublish(col.id, col.active)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                      col.active
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {col.active ? "Published" : "Draft"}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">/collection/{col.slug}</p>
                {col.description && (
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{col.description}</p>
                )}
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-semibold">
                  {col._count?.items || 0} Titles Curated
                </span>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/collection/${col.slug}`}
                    target="_blank"
                    className="text-xs font-bold text-[#FF3B6B] hover:underline"
                  >
                    View Live ↗
                  </Link>
                  <button
                    onClick={() => handleDelete(col.id, col.title)}
                    disabled={deletingId === col.id}
                    className="text-xs text-zinc-500 hover:text-rose-400 font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === col.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
