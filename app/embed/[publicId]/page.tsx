import { Metadata } from "next";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { prisma } from "@/lib/prisma";
import { selectBestOrigin } from "@/lib/origin-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Embed Player • CHILLER",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

interface EmbedPageProps {
  params: Promise<{ publicId: string }>;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { publicId } = await params;

  const video = await prisma.video.findUnique({
    where: { publicId },
    include: {
      variants: true,
      subtitles: true,
    },
  });

  // 1. Video Not Found State
  if (!video) {
    return (
      <div className="w-full h-screen bg-[#09090c] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-4">
          🔍
        </div>
        <h2 className="text-base font-bold text-white mb-1">Video Not Found</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          The requested video does not exist, has expired, or was removed by the administrator.
        </p>
        <span className="text-[10px] font-mono text-zinc-600 mt-4">ID: {publicId}</span>
      </div>
    );
  }

  // 2. Transcoding / Processing State
  if (video.status === "QUEUED" || video.status === "PROCESSING" || video.status === "TRANSCODING" || video.status === "PACKAGING") {
    return (
      <div className="w-full h-screen bg-[#09090c] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl mb-4 relative">
          <div className="absolute inset-0 rounded-2xl border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
          ⚡
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-1">
          HLS TRANSCODING IN PROGRESS
        </span>
        <h2 className="text-sm font-bold text-white mb-2">{video.title}</h2>
        <p className="text-xs text-zinc-400 max-w-sm mb-4">
          This video is currently being processed into multi-bitrate adaptive HLS streams (1080p / 720p / 480p / 360p). Please reload in a moment.
        </p>
        <div className="w-48 bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/10">
          <div className="h-full bg-gradient-to-r from-purple-500 to-[#FF3864] w-2/3 animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  // 3. Transcoding Failed State
  if (video.status === "FAILED") {
    return (
      <div className="w-full h-screen bg-[#09090c] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-2xl mb-4 text-rose-400">
          ⚠️
        </div>
        <h2 className="text-base font-bold text-white mb-1">Processing Failed</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          An error occurred while encoding this video. The administrator has been notified.
        </p>
      </div>
    );
  }

  // 4. Access Restricted / Unpublished State
  if (!video.isPublished || video.visibility === "PRIVATE") {
    return (
      <div className="w-full h-screen bg-[#09090c] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-4 text-amber-400">
          🔒
        </div>
        <h2 className="text-base font-bold text-white mb-1">Access Restricted</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          This video is currently private or unlisted by the publisher.
        </p>
      </div>
    );
  }

  // 5. Obtain Smart Origin Manifest & Stream URLs
  const manifest = await selectBestOrigin(video.id);
  const streamUrl = manifest?.streamUrl || video.hlsMasterUrl || video.fallbackMp4Url || "";
  const backupStreamUrls = manifest?.backupStreamUrls || [];

  return (
    <div className="w-full h-screen bg-black overflow-hidden m-0 p-0 flex items-center justify-center">
      <VideoPlayer
        streamUrl={streamUrl}
        backupStreamUrls={backupStreamUrls}
        title={video.title}
        posterUrl={video.backdropUrl || video.thumbnailUrl}
        subtitles={video.subtitles}
        qualities={video.variants.map((v) => ({ quality: v.quality, bitrate: v.bitrate }))}
        autoPlay={false}
      />
    </div>
  );
}
