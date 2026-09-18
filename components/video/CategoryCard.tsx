"use client";

import React from "react";
import Link from "next/link";
import { IconCategories, IconHeart, IconStar } from "@/components/icons";

interface CategoryCardProps {
  id: string;
  name: string;
  slug: string;
  thumbnail?: string | null;
  icon?: string | null;
  videoCount?: number;
  isSelected?: boolean;
}

export function CategoryCard({
  name,
  slug,
  thumbnail,
  icon,
  videoCount = 0,
  isSelected = false,
}: CategoryCardProps) {
  // Map icon names to SVG / symbol
  const renderIcon = () => {
    switch (slug) {
      case "romance":
        return <IconHeart className="w-5 h-5 text-rose-400" filled />;
      case "couples":
        return <span className="text-lg">🔥</span>;
      case "solo":
        return <span className="text-lg">👤</span>;
      case "indian":
        return <IconStar className="w-5 h-5 text-amber-400" />;
      case "lesbian":
        return <span className="text-lg">🍸</span>;
      case "fitness":
        return <span className="text-lg">🏋️</span>;
      case "amateur":
        return <span className="text-lg">🎭</span>;
      case "fantasy":
        return <span className="text-lg">💎</span>;
      default:
        return <IconCategories className="w-5 h-5 text-rose-400" />;
    }
  };

  const formattedCount =
    videoCount >= 1000
      ? `${(videoCount / 1000).toFixed(1).replace(/\.0$/, "")}K videos`
      : `${videoCount} videos`;

  return (
    <Link
      href={`/category/${slug}`}
      className={`group relative flex flex-col items-center justify-center p-4 min-w-[130px] sm:min-w-[145px] h-[135px] rounded-2xl border transition duration-200 overflow-hidden cursor-pointer ${
        isSelected
          ? "border-[#FF3864] bg-[#181822] shadow-lg shadow-rose-600/20"
          : "border-white/[0.08] bg-[#14141c] hover:border-white/20 hover:bg-[#1a1a24]"
      }`}
    >
      {/* Background Image / Gradient */}
      {thumbnail ? (
        <div className="absolute inset-0 z-0">
          <img
            src={thumbnail}
            alt={name}
            className="w-full h-full object-cover opacity-25 group-hover:opacity-40 group-hover:scale-105 transition duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121218] via-[#121218]/80 to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent z-0" />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-2 w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center group-hover:scale-110 transition duration-200">
          {renderIcon()}
        </div>

        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition">
          {name}
        </h4>

        <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
          {formattedCount}
        </span>
      </div>
    </Link>
  );
}
