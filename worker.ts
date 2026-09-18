import os from "os";
import path from "path";
import fs from "fs";
import { defaultStorage } from "./lib/storage";
import { VideoJobQueue } from "./lib/queue";
import { prisma } from "./lib/prisma";
import { transcodeToHLS } from "./lib/video-processor";

const WORKER_ID = `worker-${os.hostname().toLowerCase()}-${process.pid}`;
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "2", 10);
let isRunning = true;
let activeJobsCount = 0;

console.log("===============================================================");
console.log(`🚀 CHILLER BACKGROUND TRANSCODING WORKER (FUTURE / OWNED) STARTED`);
console.log(`   Worker ID:    ${WORKER_ID}`);
console.log(`   Concurrency:  ${CONCURRENCY}`);
console.log(`   Storage Mode: ${process.env.STORAGE_PROVIDER || "local"}`);
console.log(`   Storage Path: ${process.env.LOCAL_STORAGE_PATH || "./media_storage"}`);
console.log(`   PID:          ${process.pid}`);
console.log("===============================================================");

async function processJob(job: any) {
  activeJobsCount++;
  const startTime = Date.now();
  console.log(`\n[${new Date().toISOString()}] ▶ Starting Job ${job.id} for Video ${job.videoId}`);
  console.log(`   Source: ${job.sourceFile}`);

  try {
    // Determine output directory inside media storage
    const outputDir = path.isAbsolute(job.videoId)
      ? job.videoId
      : (defaultStorage as any).getAbsolutePath
      ? path.join((defaultStorage as any).getAbsolutePath("videos/hls"), job.videoId)
      : path.join(process.cwd(), "media_storage", "videos", "hls", job.videoId);

    // Run transcoding and packaging with verification
    const result = await transcodeToHLS(job.sourceFile, outputDir, async (pct) => {
      const stepName = pct < 50 ? "TRANSCODING" : pct < 90 ? "PACKAGING" : "VERIFYING";
      await VideoJobQueue.updateProgress(job.id, pct, stepName);
      process.stdout.write(`\r   ⏳ Transcoding Progress: ${pct}% [${stepName}]`);
    });

    console.log(`\n   ✔ HLS Generation & Verification Succeeded!`);

    // Upsert variant records in database
    for (const v of result.variants) {
      await prisma.videoVariant.upsert({
        where: {
          videoId_quality: {
            videoId: job.videoId,
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
          videoId: job.videoId,
          quality: v.quality,
          width: v.width,
          height: v.height,
          bitrate: v.bitrate,
          playlistUrl: v.playlistUrl,
        },
      });
    }

    // Complete job
    await VideoJobQueue.completeJob(job.id, job.videoId, {
      master: result.masterPlaylistUrl,
      variants: result.variants,
      thumbnailUrl: result.thumbnailUrl,
      backdropUrl: result.backdropUrl,
      durationMs: Date.now() - startTime,
    });

    // Handle Telegram media status update and staging file cleanup
    if (job.type === "TELEGRAM_IMPORT") {
      const media = await prisma.telegramMedia.findFirst({
        where: { videoId: job.videoId },
      });
      if (media) {
        await prisma.telegramMedia.update({
          where: { id: media.id },
          data: { status: "READY" },
        });
        await prisma.telegramImportItem.updateMany({
          where: { mediaId: media.id },
          data: { status: "READY" },
        });
      }

      // Cleanup temporary staging file
      if (job.sourceFile && job.sourceFile.includes("tmp") && fs.existsSync(job.sourceFile)) {
        try {
          fs.unlinkSync(job.sourceFile);
          const parentDir = path.dirname(job.sourceFile);
          if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
            fs.rmdirSync(parentDir);
          }
        } catch {
          // Non-fatal
        }
      }
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${new Date().toISOString()}] ✔ Job ${job.id} finished in ${durationSec}s\n`);
  } catch (err: any) {
    console.error(`\n[${new Date().toISOString()}] ✖ Job ${job.id} failed:`, err.message);
    await VideoJobQueue.failJob(job.id, job.videoId, err.message || "Unknown error during transcoding");

    if (job.type === "TELEGRAM_IMPORT") {
      const media = await prisma.telegramMedia.findFirst({
        where: { videoId: job.videoId },
      });
      if (media) {
        await prisma.telegramMedia.update({
          where: { id: media.id },
          data: { status: "FAILED", errorMessage: err.message },
        });
        await prisma.telegramImportItem.updateMany({
          where: { mediaId: media.id },
          data: { status: "FAILED", errorMessage: err.message },
        });
      }
    }
  } finally {
    activeJobsCount--;
  }
}

async function workerLoop() {
  while (isRunning) {
    try {
      if (activeJobsCount < CONCURRENCY) {
        const job = await VideoJobQueue.acquireNextJob(WORKER_ID);
        if (job && job.sourceFile) {
          // Process job in parallel up to concurrency limit
          processJob(job).catch(console.error);
          continue;
        }
      }

      // No job found or at max concurrency, sleep briefly
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (err: any) {
      console.error("Worker poll error:", err.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log(`Worker ${WORKER_ID} stopped gracefully.`);
  await prisma.$disconnect();
  process.exit(0);
}

// Graceful shutdown handling
process.on("SIGINT", () => {
  console.log(`\nReceived SIGINT. Shutting down worker ${WORKER_ID}...`);
  isRunning = false;
});

process.on("SIGTERM", () => {
  console.log(`\nReceived SIGTERM. Shutting down worker ${WORKER_ID}...`);
  isRunning = false;
});

// Start loop
workerLoop();
