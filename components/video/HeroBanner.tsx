"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  IconChevronLeft,
  IconChevronRight,
  IconHeart,
  IconLightning,
  IconPlay,
  IconPlus,
  IconShield,
} from "@/components/icons";

export interface HeroSlide {
  id: string;
  slug: string;
  tag: string;
  titlePrimary: string;
  titleSecondary: string;
  subtitle: string;
  description: string;
  backdropUrl: string;
  duration?: number;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "hero-1",
    slug: "closer-than-ever",
    tag: "FEATURED THIS WEEK",
    titlePrimary: "Closer",
    titleSecondary: "Than Ever",
    subtitle: "Desire. Emotions. Real Connections.",
    description: "Explore a world of uncensored moments, passionate stories, and exclusive content made for adults.",
    backdropUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1920&auto=format&fit=crop",
  },
  {
    id: "hero-2",
    slug: "real-people-real-desires",
    tag: "ADULT ENTERTAINMENT",
    titlePrimary: "Real People",
    titleSecondary: "Real Desires",
    subtitle: "Passion. Intimacy. Authenticity.",
    description: "Unfiltered romance and intense chemistry from top verified creators worldwide.",
    backdropUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1920&auto=format&fit=crop",
  },
];

export function HeroBanner({ slides = DEFAULT_SLIDES }: { slides?: HeroSlide[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const activeSlides = slides.length > 0 ? slides : DEFAULT_SLIDES;
  const activeSlide = activeSlides[currentIdx % activeSlides.length];

  const prevSlide = () => {
    setCurrentIdx((prev) => (prev === 0 ? activeSlides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIdx((prev) => (prev === activeSlides.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden border border-white/[0.08] bg-[#101017] shadow-2xl mb-10">
      {/* Background Cinematic Image with Gradient Masks */}
      <div className="absolute inset-0 z-0">
        <img
          src={activeSlide.backdropUrl}
          alt={activeSlide.titlePrimary}
          className="w-full h-full object-cover object-center transition-all duration-700 ease-out"
        />
        {/* Left Dark Gradient Mask for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090c] via-[#09090c]/85 to-transparent" />
        {/* Bottom Dark Gradient Mask */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090c] via-transparent to-transparent" />
      </div>

      {/* Decorative Cursive Accent on Right (Matching Screenshot 1) */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none select-none text-right z-10">
        <span className="font-serif italic text-3xl lg:text-4xl text-rose-200/40 tracking-wider drop-shadow-md">
          Real Stories<br />Real Desires ♡
        </span>
      </div>

      {/* Carousel Navigation Arrows */}
      <button
        onClick={prevSlide}
        aria-label="Previous Slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center transition cursor-pointer"
      >
        <IconChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={nextSlide}
        aria-label="Next Slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center transition cursor-pointer"
      >
        <IconChevronRight className="w-4 h-4" />
      </button>

      {/* Hero Content Area */}
      <div className="relative z-10 max-w-2xl px-8 py-12 md:py-20 lg:px-14 flex flex-col justify-center">
        {/* Tag / Category Badge */}
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-rose-400 mb-3 block">
          {activeSlide.tag}
        </span>

        {/* Two-Tone Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-2 leading-tight">
          {activeSlide.titlePrimary}{" "}
          <span className="velora-text-gradient">{activeSlide.titleSecondary}</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base font-semibold text-zinc-300 mb-3">
          {activeSlide.subtitle}
        </p>

        {/* Description */}
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg leading-relaxed mb-8 line-clamp-2">
          {activeSlide.description}
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/watch/${activeSlide.slug}`}
            className="flex items-center gap-2.5 px-6 py-3 rounded-full velora-gradient text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/30 hover:opacity-95 transition transform active:scale-95"
          >
            <IconPlay className="w-4 h-4 ml-0.5" />
            <span>Watch Now</span>
          </Link>

          <button
            onClick={() => alert("Added to your watchlist!")}
            className="flex items-center gap-2 px-5 py-3 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-semibold backdrop-blur-md transition cursor-pointer"
          >
            <IconPlus className="w-4 h-4" />
            <span>My List</span>
          </button>
        </div>

        {/* Trust Badges (Matching Screenshot 2) */}
        <div className="mt-10 pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-6 text-zinc-400">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <IconShield className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-200">Private & Secure</p>
              <p className="text-[10px] text-zinc-400">Your privacy matters</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <IconLightning className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-200">HD Quality</p>
              <p className="text-[10px] text-zinc-400">Crystal clear videos</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <IconHeart className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-200">New Content Daily</p>
              <p className="text-[10px] text-zinc-400">Fresh scenes everyday</p>
            </div>
          </div>
        </div>
      </div>

      {/* Carousel Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {activeSlides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIdx(idx)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              currentIdx === idx ? "w-6 bg-[#FF3864]" : "w-2 bg-white/30 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
