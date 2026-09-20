import React from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaCard } from "@/components/video/MediaCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;

  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!collection || !collection.active) {
    notFound();
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden space-y-8">
        {/* Collection Hero */}
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0F172A] p-6 sm:p-10 shadow-2xl min-h-[260px] flex flex-col justify-end">
          {collection.backdropUrl && (
            <div className="absolute inset-0 z-0">
              <Image
                src={collection.backdropUrl}
                alt={collection.title}
                fill
                priority
                className="object-cover opacity-30"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/70 to-transparent" />
            </div>
          )}

          <div className="relative z-10 space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#FF3B6B]/20 border border-[#FF3B6B]/30 text-[#FF3B6B] text-[10px] font-black uppercase tracking-wider">
              Featured Collection
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                {collection.description}
              </p>
            )}
          </div>
        </div>

        {/* Collection Items Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tight">
              Curated Titles ({collection.items.length})
            </h2>
          </div>

          {collection.items.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 rounded-2xl border border-white/5 bg-[#0F172A]">
              Titles are currently being curated for this collection. Check back soon!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {collection.items.map((item) => (
                <MediaCard
                  key={item.id}
                  id={item.tmdbId || item.anilistId || item.id}
                  title={item.title}
                  posterPath={item.posterUrl || "/placeholder-poster.png"}
                  mediaType={(item.mediaType as any) || "movie"}
                  layout="poster"
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
