"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface VideoRowActionsProps {
  videoId: string;
  publicId: string;
  slug: string;
  isPublished: boolean;
  status: string;
}

export function VideoRowActions({
  videoId,
  publicId,
  slug,
  isPublished,
  status,
}: VideoRowActionsProps) {
  const router = useRouter();
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [published, setPublished] = useState(isPublished);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const togglePublished = async () => {
    try {
      const nextState = !published;
      setPublished(nextState);
      await fetch(`/api/admin/videos/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: nextState }),
      });
      router.refresh();
    } catch {
      setPublished(published);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // Non-fatal
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const watchUrl = `${origin}/watch/${slug}`;
  const embedUrl = `${origin}/embed/${publicId}`;
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {/* Preview Link */}
      <Link
        href={`/watch/${slug}`}
        target="_blank"
        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition text-xs font-semibold"
      >
        Preview
      </Link>

      {/* Copy Watch Link */}
      <button
        type="button"
        onClick={() => copyToClipboard(watchUrl, "watch")}
        title="Copy direct watch link"
        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition text-xs cursor-pointer"
      >
        {copiedType === "watch" ? "✔ Copied" : "Watch Link"}
      </button>

      {/* Copy Embed Code (iframe) */}
      <button
        type="button"
        onClick={() => copyToClipboard(embedCode, "iframe")}
        title="Copy responsive iframe embed code"
        className="px-2 py-1 rounded-lg velora-gradient text-white hover:opacity-90 transition text-xs font-bold shadow-sm shadow-rose-600/30 cursor-pointer"
      >
        {copiedType === "iframe" ? "✔ Embed Copied" : "⚡ Embed Code"}
      </button>

      {/* Toggle Publish */}
      <button
        type="button"
        onClick={togglePublished}
        title={published ? "Unpublish video" : "Publish video"}
        className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
          published
            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
        }`}
      >
        {published ? "Published" : "Hidden"}
      </button>

      {/* Delete Confirmation */}
      {showConfirmDelete ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition cursor-pointer"
          >
            {isDeleting ? "..." : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmDelete(false)}
            className="px-1.5 py-1 rounded-lg bg-white/10 text-zinc-400 hover:text-white text-[11px] transition cursor-pointer"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirmDelete(true)}
          title="Delete video"
          className="p-1 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-rose-400 text-xs transition cursor-pointer"
        >
          🗑️
        </button>
      )}
    </div>
  );
}
