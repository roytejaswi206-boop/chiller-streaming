import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { WatchExperience } from "@/components/player/WatchExperience";
import { resolveContent } from "@/lib/playback/resolver";

export const dynamic = "force-dynamic";

interface WatchPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ s?: string; e?: string; season?: string; episode?: string; type?: string }>;
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;

  const season = parseInt(sParams.s || sParams.season || "1", 10);
  const episode = parseInt(sParams.e || sParams.episode || "1", 10);

  const content = await resolveContent(slug, { season, episode });

  if (!content) {
    notFound();
  }

  const slugString = Array.isArray(slug) ? slug.join("/") : slug;

  return (
    <>
      {/* Provider connection hints (Preconnect & DNS-prefetch) */}
      <link rel="preconnect" href="https://cinesrc.st" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://cinesrc.st" />
      <link rel="preconnect" href="https://vidsrc.sbs" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://vidsrc.sbs" />
      <link rel="preconnect" href="https://nhdapi.st" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://nhdapi.st" />

      <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
        <Sidebar />

        <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
          <WatchExperience
            initialSources={content.sources}
            title={content.title}
            originalTitle={content.originalTitle}
            overview={content.overview}
            posterUrl={content.posterUrl}
            backdropUrl={content.backdropUrl}
            releaseYear={content.releaseYear}
            genres={content.genres}
            rating={content.rating}
            runtime={content.runtime}
            mediaType={content.mediaType as any}
            sourceType={content.sourceType}
            tmdbId={content.tmdbId}
            anilistId={content.anilistId}
            initialSeason={season}
            initialEpisode={episode}
            totalSeasons={content.totalSeasons}
            seasons={content.seasons}
            currentSeasonDetails={content.currentSeasonDetails}
            cast={content.cast}
            recommendations={content.recommendations}
            streamUrl={content.streamUrl}
            backupStreamUrls={content.backupStreamUrls}
            subtitles={content.subtitles}
            qualities={content.qualities}
            slug={slugString}
          />
        </main>
      </div>
    </>
  );
}
