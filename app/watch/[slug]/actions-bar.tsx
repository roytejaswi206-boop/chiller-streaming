"use client";

import React, { useState } from "react";
import { ShareModal } from "@/components/common/ShareModal";
import { IconHeart, IconPlus } from "@/components/icons";

export interface WatchActionsBarProps {
  videoId: string;
  publicId: string;
  slug: string;
  title: string;
  initialLikes: number;
}

export function WatchActionsBar({
  videoId,
  publicId,
  slug,
  title,
  initialLikes,
}: WatchActionsBarProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const handleLike = () => {
    if (hasLiked) {
      setLikes((prev) => Math.max(0, prev - 1));
      setHasLiked(false);
    } else {
      setLikes((prev) => prev + 1);
      setHasLiked(true);
    }
  };

  const handleWatchlist = () => {
    setInWatchlist(!inWatchlist);
  };

  const handleReport = () => {
    alert("Thank you. This video report has been submitted to moderation.");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
            hasLiked
              ? "border-rose-500 bg-rose-500/15 text-rose-400"
              : "border-white/10 hover:border-white/20 bg-white/5 text-zinc-300 hover:text-white"
          }`}
        >
          <IconHeart className={`w-3.5 h-3.5 ${hasLiked ? "fill-current" : ""}`} />
          <span>{likes}</span>
        </button>

        {/* Add to Watchlist */}
        <button
          onClick={handleWatchlist}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
            inWatchlist
              ? "border-rose-500 bg-rose-500/15 text-rose-400"
              : "border-white/10 hover:border-white/20 bg-white/5 text-zinc-300 hover:text-white"
          }`}
        >
          <IconPlus className="w-3.5 h-3.5" />
          <span>{inWatchlist ? "In List" : "My List"}</span>
        </button>

        {/* Share & Embed Button */}
        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer"
        >
          <span>Share / Embed</span>
        </button>

        {/* Report Button */}
        <button
          onClick={handleReport}
          title="Report Video"
          className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition cursor-pointer"
        >
          <span className="text-xs">⚐</span>
        </button>
      </div>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        videoTitle={title}
        publicId={publicId}
        videoSlug={slug}
      />
    </>
  );
}
