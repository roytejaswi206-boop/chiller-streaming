import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { defaultStorage } from "../lib/storage";
import { computeContentHash, inspectVideo, transcodeToHLS } from "../lib/video-processor";
import { verifyHLSStream } from "../lib/hls-verifier";
import { generatePlaybackToken, selectBestOrigin } from "../lib/origin-manager";

async function runSingleVideoTest() {
  console.log("===============================================================");
  console.log("🎬 VELORA END-TO-END SINGLE VIDEO PIPELINE VERIFICATION");
  console.log("===============================================================");

  const originalDir = path.join(process.cwd(), "media_storage", "videos", "original");
  if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true });

  const sampleMp4Path = path.join(originalDir, "real_test_sample.mp4");

  // Step 1: Generate a real MP4 video file with audio using FFmpeg
  console.log("\n1. Generating genuine MP4 video file using FFmpeg...");
  const genCmd = `ffmpeg -y -f lavfi -i testsrc=duration=8:size=1280x720:rate=30 -f lavfi -i sine=frequency=440:duration=8 -c:v libx264 -preset ultrafast -c:a aac -b:a 128k "${sampleMp4Path}"`;
  execSync(genCmd, { stdio: "ignore" });

  const stat = fs.statSync(sampleMp4Path);
  console.log(`✔ Sample video created: ${sampleMp4Path} (${(stat.size / 1024).toFixed(1)} KB)`);

  // Step 2: Content Hashing (SHA-256)
  console.log("\n2. Computing streaming SHA-256 content hash...");
  const hash = await computeContentHash(sampleMp4Path);
  console.log(`✔ SHA-256 Hash: ${hash}`);

  // Step 3: FFprobe Metadata Extraction
  console.log("\n3. Inspecting video metadata via FFprobe JSON...");
  const meta = await inspectVideo(sampleMp4Path);
  console.log(`✔ Extracted Metadata:`);
  console.log(`   - Resolution: ${meta.width}x${meta.height} (${meta.resolution})`);
  console.log(`   - Duration:   ${meta.duration}s`);
  console.log(`   - Codec:      ${meta.codec} (Video), ${meta.audioCodec || "N/A"} (Audio)`);
  console.log(`   - FPS:        ${meta.fps}`);

  // Step 4: Database Registration
  console.log("\n4. Registering video record in database...");
  const category = await prisma.category.findFirst();
  const slug = `real-verified-stream-${Date.now().toString(36)}`;

  // Delete if previous test exists
  await prisma.video.deleteMany({ where: { slug } });

  const video = await prisma.video.create({
    data: {
      title: "Real Verified Test Stream (HD 720p)",
      slug,
      description: "End-to-end verified HLS stream with adaptive renditions and signed playback.",
      duration: meta.duration,
      resolution: meta.resolution,
      fps: meta.fps,
      codec: meta.codec,
      fileSize: BigInt(stat.size),
      contentHash: hash,
      thumbnailUrl: "/images/placeholder.jpg",
      status: "PROCESSING",
      isPublished: true,
      categoryId: category?.id,
    },
  });
  console.log(`✔ Created database record: ID=${video.id}, Slug=${video.slug}`);

  // Step 5: Transcoding to HLS & Verification
  console.log("\n5. Transcoding to multi-variant HLS ladder (no upscaling)...");
  const hlsDir = path.join(process.cwd(), "media_storage", "videos", "hls", video.id);

  const transcodeResult = await transcodeToHLS(sampleMp4Path, hlsDir, (pct) => {
    process.stdout.write(`\r   ⏳ Progress: ${pct}%`);
  });
  console.log(`\n✔ Transcoding complete! Master URL: ${transcodeResult.masterPlaylistUrl}`);
  console.log(`   - Generated ${transcodeResult.variants.length} renditions: ${transcodeResult.variants.map((v) => v.quality).join(", ")}`);

  // Step 6: Automated HLS Verification
  console.log("\n6. Running automated HLS verification audit...");
  const verification = await verifyHLSStream(hlsDir);
  if (!verification.valid) {
    throw new Error(`Verification failed: ${verification.error}`);
  }
  console.log(`✔ HLS Verification: PASSED!`);
  console.log(`   - Master manifest:  Present & valid`);
  console.log(`   - Variant streams:  ${verification.variantCount} valid playlists`);
  console.log(`   - Total segments:   ${verification.segmentCount} playable .ts chunks`);
  console.log(`   - Package size:     ${(verification.totalSizeBytes / 1024).toFixed(1)} KB`);

  // Step 7: Update Video & Variants in Database
  console.log("\n7. Updating database records with verified streams...");
  for (const v of transcodeResult.variants) {
    await prisma.videoVariant.upsert({
      where: {
        videoId_quality: {
          videoId: video.id,
          quality: v.quality,
        },
      },
      update: {
        width: v.width,
        height: v.height,
        bitrate: v.bitrate,
        playlistUrl: v.playlistUrl,
      },
      create: {
        videoId: video.id,
        quality: v.quality,
        width: v.width,
        height: v.height,
        bitrate: v.bitrate,
        playlistUrl: v.playlistUrl,
      },
    });
  }

  await prisma.video.update({
    where: { id: video.id },
    data: {
      status: "READY",
      hlsMasterUrl: transcodeResult.masterPlaylistUrl,
      thumbnailUrl: transcodeResult.thumbnailUrl,
      backdropUrl: transcodeResult.backdropUrl,
    },
  });
  console.log(`✔ Video marked READY in database.`);

  // Step 8: Signed Playback Authorization
  console.log("\n8. Generating signed playback token & origin routing...");
  const token = generatePlaybackToken(video.id, "127.0.0.1");
  const manifest = await selectBestOrigin(video.id, "global", "127.0.0.1");
  console.log(`✔ Signed playback manifest generated:`);
  console.log(`   - Stream URL:       ${manifest?.streamUrl}`);
  console.log(`   - Token:            ${token.substring(0, 32)}...`);
  console.log(`   - Origin:           ${manifest?.originServer.name} (${manifest?.originServer.status})`);
  console.log(`   - Expires At:       ${new Date((manifest?.expiresAt || 0) * 1000).toISOString()}`);

  console.log("\n===============================================================");
  console.log("🎉 ALL PIPELINE STAGES PASSED FOR REAL TEST VIDEO!");
  console.log(`   Watch URL: http://localhost:3000/watch/${video.slug}`);
  console.log(`   Embed URL: http://localhost:3000/embed/${video.publicId}`);
  console.log("===============================================================");

  await prisma.$disconnect();
}

runSingleVideoTest().catch((err) => {
  console.error("Test pipeline failed:", err);
  process.exit(1);
});
