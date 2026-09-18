"use client";

import React, { useState } from "react";
import { IconCheck } from "@/components/icons";

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  publicId: string;
  videoSlug: string;
}

export function ShareModal({
  isOpen,
  onClose,
  videoTitle,
  publicId,
  videoSlug,
}: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  if (!isOpen) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://chiller.tv";
  const watchUrl = `${baseUrl}/watch/${videoSlug}`;
  const embedCode = `<iframe src="${baseUrl}/embed/${publicId}" width="100%" height="480" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`;

  const copyWatchUrl = () => {
    navigator.clipboard.writeText(watchUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <h3 className="text-base font-bold text-white">Share Video</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-sm transition"
          >
            ✕
          </button>
        </div>

        <p className="text-xs font-semibold text-zinc-300 mb-4 truncate">
          {videoTitle}
        </p>

        {/* Watch Link */}
        <div className="mb-5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
            Direct Watch Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={watchUrl}
              className="flex-1 h-9 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-zinc-300 font-mono select-all focus:outline-none"
            />
            <button
              onClick={copyWatchUrl}
              className="h-9 px-4 rounded-xl velora-gradient text-white text-xs font-bold shadow hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <IconCheck className="w-3.5 h-3.5" /> : null}
              <span>{copiedLink ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Embed Code */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
            Embed Code (Responsive Player)
          </label>
          <textarea
            readOnly
            rows={3}
            value={embedCode}
            className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-zinc-300 font-mono select-all focus:outline-none resize-none mb-2"
          />
          <button
            onClick={copyEmbedCode}
            className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiedEmbed ? <IconCheck className="w-3.5 h-3.5 text-rose-400" /> : null}
            <span>{copiedEmbed ? "Embed Code Copied" : "Copy Embed Code"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
