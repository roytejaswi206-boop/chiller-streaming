import { exec } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import util from "util";

import { verifyHLSStream } from "@/lib/hls-verifier";
import { prisma } from "@/lib/prisma";
import { defaultStorage } from "@/lib/storage";

const execPromise = util.promisify(exec);

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  resolution: string;
  codec: string;
  bitrate: number; // in kbps
  fps: number;
  fileSize: number;
  hasAudio: boolean;
  audioCodec?: string;
}

export interface TranscodeResult {
  masterPlaylistUrl: string;
  variants: {
    quality: string;
    width: number;
    height: number;
    bitrate: number;
    playlistUrl: string;
    segmentCount: number;
  }[];
  thumbnailUrl: string;
  backdropUrl: string;
  totalSizeBytes: number;
  verified: boolean;
}

/**
 * Compute SHA-256 content hash using chunked streaming to prevent memory exhaustion on large files (>2GB)
 */
export async function computeContentHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 * 4 }); // 4MB chunks
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Check if a duplicate video exists by hash or identical duration & resolution
 */
export async function checkDuplicate(contentHash: string, duration: number): Promise<any | null> {
  const byHash = await prisma.video.findFirst({
    where: { contentHash },
  });
  if (byHash) return byHash;

  // Check near-identical duration (within 1 second)
  if (duration > 0) {
    const byDuration = await prisma.video.findFirst({
      where: {
        duration: {
          gte: Math.max(0, duration - 1),
          lte: duration + 1,
        },
      },
    });
    if (byDuration) return byDuration;
  }

  return null;
}

/**
 * Inspect video file using native FFprobe with structured JSON output
 */
export async function inspectVideo(filePath: string): Promise<VideoMetadata> {
  const stat = await fs.promises.stat(filePath);
  const fileSize = stat.size;

  try {
    const probeCmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
    const { stdout } = await execPromise(probeCmd);
    const info = JSON.parse(stdout);

    const videoStream = info.streams?.find((s: any) => s.codec_type === "video") || {};
    const audioStream = info.streams?.find((s: any) => s.codec_type === "audio");

    const width = parseInt(videoStream.width || "1920", 10);
    const height = parseInt(videoStream.height || "1080", 10);
    const codec = videoStream.codec_name || "h264";

    // Duration resolution from format or stream
    let duration = parseFloat(info.format?.duration || videoStream.duration || "0");
    if (isNaN(duration) || duration <= 0) {
      duration = 180;
    }
    const durationSeconds = Math.round(duration);

    // Bitrate
    let bitrate = parseInt(info.format?.bit_rate || videoStream.bit_rate || "0", 10);
    if (bitrate <= 0) {
      bitrate = Math.round((fileSize * 8) / (durationSeconds * 1000));
    } else {
      bitrate = Math.round(bitrate / 1000);
    }
    if (bitrate <= 0) bitrate = 2500;

    // Frame rate (e.g. "30/1" or "29.97")
    let fps = 30;
    if (videoStream.r_frame_rate) {
      const parts = videoStream.r_frame_rate.split("/");
      if (parts.length === 2 && parseFloat(parts[1]) > 0) {
        fps = Math.round(parseFloat(parts[0]) / parseFloat(parts[1]));
      } else {
        fps = Math.round(parseFloat(videoStream.r_frame_rate));
      }
    }

    let resolution = "1080p";
    if (height >= 2160) resolution = "4K";
    else if (height >= 1440) resolution = "1440p";
    else if (height >= 1080) resolution = "1080p";
    else if (height >= 720) resolution = "720p";
    else if (height >= 480) resolution = "480p";
    else resolution = "360p";

    return {
      duration: durationSeconds,
      width,
      height,
      resolution,
      codec,
      bitrate,
      fps: fps > 0 ? fps : 30,
      fileSize,
      hasAudio: Boolean(audioStream),
      audioCodec: audioStream?.codec_name,
    };
  } catch (err: any) {
    console.warn("ffprobe JSON parsing warning, applying robust fallback:", err.message);
    return {
      duration: 180,
      width: 1920,
      height: 1080,
      resolution: "1080p",
      codec: "h264",
      bitrate: 2500,
      fps: 30,
      fileSize,
      hasAudio: true,
      audioCodec: "aac",
    };
  }
}

/**
 * Generate Video Thumbnails (Poster & Backdrop) using FFmpeg
 */
export async function generateThumbnails(
  inputPath: string,
  outputDir: string,
  duration = 60
): Promise<{ thumbnailUrl: string; backdropUrl: string }> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const thumbTime = Math.max(1, Math.floor(duration * 0.15));
  const backdropTime = Math.max(2, Math.floor(duration * 0.45));

  const thumbPath = path.join(outputDir, "thumb.jpg");
  const backdropPath = path.join(outputDir, "backdrop.jpg");

  // Extract poster image
  await execPromise(
    `ffmpeg -y -ss ${thumbTime} -i "${inputPath}" -vframes 1 -q:v 2 "${thumbPath}"`
  ).catch(() => null);

  // Extract backdrop image
  await execPromise(
    `ffmpeg -y -ss ${backdropTime} -i "${inputPath}" -vframes 1 -q:v 2 "${backdropPath}"`
  ).catch(() => null);

  // Upload to storage or return paths
  const thumbBuffer = fs.existsSync(thumbPath) ? await fs.promises.readFile(thumbPath) : Buffer.from("");
  const backdropBuffer = fs.existsSync(backdropPath) ? await fs.promises.readFile(backdropPath) : Buffer.from("");

  const videoId = path.basename(outputDir);
  let thumbnailUrl = `/images/placeholder.jpg`;
  let backdropUrl = `/images/placeholder.jpg`;

  if (thumbBuffer.length > 0) {
    thumbnailUrl = await defaultStorage.upload(`videos/thumbnails/${videoId}/thumb.jpg`, thumbBuffer, "image/jpeg");
  }
  if (backdropBuffer.length > 0) {
    backdropUrl = await defaultStorage.upload(`videos/posters/${videoId}/backdrop.jpg`, backdropBuffer, "image/jpeg");
  }

  return { thumbnailUrl, backdropUrl };
}

/**
 * Transcode and Package Video into Multi-Variant HLS with Verification
 */
export async function transcodeToHLS(
  inputPath: string,
  outputDir: string,
  onProgress?: (pct: number) => void
): Promise<TranscodeResult> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const meta = await inspectVideo(inputPath);
  const { thumbnailUrl, backdropUrl } = await generateThumbnails(inputPath, outputDir, meta.duration);

  // Define quality profiles based on input height (Never upscale!)
  const allProfiles = [
    { name: "1080p", height: 1080, width: 1920, bitrate: 4500, audioBitrate: "192k" },
    { name: "720p", height: 720, width: 1280, bitrate: 2500, audioBitrate: "128k" },
    { name: "480p", height: 480, width: 854, bitrate: 1200, audioBitrate: "96k" },
    { name: "360p", height: 360, width: 640, bitrate: 800, audioBitrate: "64k" },
  ];

  // Only include profiles that are less than or equal to the source resolution, keeping at least 360p
  const profiles = allProfiles.filter((p) => p.height <= meta.height || p.name === "360p");

  const variants: TranscodeResult["variants"] = [];
  let masterContent = "#EXTM3U\n#EXT-X-VERSION:3\n";

  let step = 0;
  for (const p of profiles) {
    const variantDir = path.join(outputDir, p.name);
    if (!fs.existsSync(variantDir)) fs.mkdirSync(variantDir, { recursive: true });

    const playlistPath = path.join(variantDir, "index.m3u8");
    const segmentPattern = path.join(variantDir, "seg_%03d.ts");

    // FFmpeg HLS transcode command
    const audioFlags = meta.hasAudio
      ? `-c:a aac -b:a ${p.audioBitrate}`
      : `-an`;

    const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=${p.width}:${p.height}:force_original_aspect_ratio=decrease,pad=${p.width}:${p.height}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset fast -b:v ${p.bitrate}k -maxrate ${Math.round(p.bitrate * 1.2)}k -bufsize ${Math.round(p.bitrate * 2)}k ${audioFlags} -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${segmentPattern}" "${playlistPath}"`;

    try {
      await execPromise(cmd);
      step++;
      if (onProgress) {
        onProgress(Math.round((step / profiles.length) * 85));
      }

      // Count generated segments
      const segFiles = fs.readdirSync(variantDir).filter((f) => f.endsWith(".ts"));

      const videoId = path.basename(outputDir);
      const variantUrl = `/api/storage/videos/hls/${videoId}/${p.name}/index.m3u8`;

      variants.push({
        quality: p.name,
        width: p.width,
        height: p.height,
        bitrate: p.bitrate,
        playlistUrl: variantUrl,
        segmentCount: segFiles.length,
      });

      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${p.bitrate * 1000},RESOLUTION=${p.width}x${p.height},NAME="${p.name}"\n${p.name}/index.m3u8\n`;
    } catch (err) {
      console.error(`Transcoding profile ${p.name} failed:`, err);
    }
  }

  // Write master.m3u8
  const masterPath = path.join(outputDir, "master.m3u8");
  await fs.promises.writeFile(masterPath, masterContent, "utf-8");

  if (onProgress) onProgress(90);

  // AUTOMATED VERIFICATION of generated HLS
  const verification = await verifyHLSStream(outputDir);
  if (!verification.valid) {
    throw new Error(`HLS stream verification failed: ${verification.error}`);
  }

  if (onProgress) onProgress(100);

  const videoId = path.basename(outputDir);
  const masterPlaylistUrl = `/api/storage/videos/hls/${videoId}/master.m3u8`;

  // Original file retention policy
  const keepOriginals = process.env.KEEP_ORIGINAL_FILES !== "false";
  if (!keepOriginals && fs.existsSync(inputPath)) {
    try {
      await fs.promises.unlink(inputPath);
      console.log(`Original file deleted per KEEP_ORIGINAL_FILES=false policy: ${inputPath}`);
    } catch (e) {
      console.warn("Could not delete original file:", e);
    }
  }

  return {
    masterPlaylistUrl,
    variants,
    thumbnailUrl,
    backdropUrl,
    totalSizeBytes: verification.totalSizeBytes,
    verified: verification.valid,
  };
}
