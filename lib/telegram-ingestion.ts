import fs from "fs";
import path from "path";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { VideoJobQueue } from "@/lib/queue";
import { BatchImportManager } from "@/lib/batch-importer";
import { checkDuplicate, computeContentHash, inspectVideo } from "@/lib/video-processor";

export interface TelegramChannelConfig {
  channelUsername: string;
  maxVideos?: number;
  qualityPreference?: string;
}

export class TelegramIngestionWorker {
  /**
   * Check if Telegram client credentials are configured
   */
  static isConfigured(): boolean {
    return Boolean(
      process.env.TELEGRAM_API_ID &&
      process.env.TELEGRAM_API_HASH &&
      process.env.TELEGRAM_BOT_TOKEN
    );
  }

  /**
   * Test Telegram connection without downloading media
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "TELEGRAM CREDENTIALS NOT CONFIGURED. Set TELEGRAM_API_ID and TELEGRAM_BOT_TOKEN in .env",
      };
    }

    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await res.json();
      if (data.ok) {
        return { success: true, message: `Connected to Telegram Bot: @${data.result.username}` };
      }
      return { success: false, message: `Telegram error: ${data.description}` };
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err.message}` };
    }
  }

  /**
   * Process a single media file ingested from Telegram or local staging
   */
  static async processIngestedFile(
    tempFilePath: string,
    title: string,
    categorySlug = "romance",
    batchContext?: { batchJobId: string; batchItemId: string }
  ): Promise<{ success: boolean; videoId?: string; duplicateOf?: string; error?: string }> {
    try {
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Source file not found at ${tempFilePath}`);
      }

      if (batchContext) {
        BatchImportManager.updateItemState(batchContext.batchJobId, batchContext.batchItemId, "DOWNLOADING");
      }

      // 1. Extract metadata via ffprobe JSON
      const meta = await inspectVideo(tempFilePath);

      if (batchContext) {
        BatchImportManager.updateItemState(batchContext.batchJobId, batchContext.batchItemId, "HASHED");
      }

      // 2. Compute streaming chunked hash
      const hash = await computeContentHash(tempFilePath);

      // 3. Duplicate Detection
      const duplicate = await checkDuplicate(hash, meta.duration);
      if (duplicate) {
        logger.warn("TELEGRAM", `Duplicate detected for "${title}". Matches video ${duplicate.id}`);
        if (batchContext) {
          BatchImportManager.updateItemState(batchContext.batchJobId, batchContext.batchItemId, "SKIPPED_DUPLICATE", {
            contentHash: hash,
            videoId: duplicate.id,
          });
        }
        return { success: false, duplicateOf: duplicate.id };
      }

      // 4. Resolve category
      let category = await prisma.category.findUnique({ where: { slug: categorySlug } });
      if (!category) {
        category = await prisma.category.findFirst();
      }

      // 5. Create Video record
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
      const video = await prisma.video.create({
        data: {
          title,
          slug,
          duration: meta.duration,
          resolution: meta.resolution,
          fps: meta.fps,
          codec: meta.codec,
          fileSize: BigInt(meta.fileSize),
          contentHash: hash,
          thumbnailUrl: "/images/placeholder.jpg",
          status: "QUEUED",
          categoryId: category?.id,
        },
      });

      // 6. Enqueue into background transcode worker
      await VideoJobQueue.enqueue(video.id, tempFilePath, "TELEGRAM_IMPORT");

      if (batchContext) {
        BatchImportManager.updateItemState(batchContext.batchJobId, batchContext.batchItemId, "QUEUED", {
          contentHash: hash,
          videoId: video.id,
        });
      }

      logger.info("TELEGRAM", `Ingested "${title}" -> Video ${video.id} successfully queued`);
      return { success: true, videoId: video.id };
    } catch (err: any) {
      logger.error("TELEGRAM", `Failed to process ingested file: ${err.message}`);
      if (batchContext) {
        BatchImportManager.updateItemState(batchContext.batchJobId, batchContext.batchItemId, "FAILED", {
          errorMessage: err.message,
        });
      }
      return { success: false, error: err.message };
    }
  }
}
