import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { VideoJobQueue } from "@/lib/queue";
import { slugify } from "@/lib/utils";
import { downloadTelegramMediaItem } from "./downloader";
import { checkAvailableDiskSpace } from "./disk-guard";

export interface CreateImportJobParams {
  sourceId: string;
  mode?: "NEW_ONLY" | "FULL_SYNC" | "SELECTED" | "BATCH";
  batchSize?: number;
  maxFileSize?: bigint;
  selectedMediaIds?: string[];
  categoryId?: string;
}

export class TelegramImportManager {
  private static activeJobs = new Set<string>();

  /**
   * Create a new Telegram Import Job and populate item queue.
   */
  static async createJob(params: CreateImportJobParams) {
    const {
      sourceId,
      mode = "NEW_ONLY",
      batchSize = 50,
      maxFileSize,
      selectedMediaIds,
      categoryId,
    } = params;

    const source = await prisma.telegramSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new Error("TelegramSource not found.");
    }

    // Select eligible media items
    let mediaItems: any[] = [];

    if (mode === "SELECTED" && selectedMediaIds && selectedMediaIds.length > 0) {
      mediaItems = await prisma.telegramMedia.findMany({
        where: { id: { in: selectedMediaIds } },
      });
    } else {
      const whereClause: any = {
        sourceId: source.id,
        status: "DISCOVERED",
      };

      if (maxFileSize) {
        whereClause.fileSizeBytes = { lte: maxFileSize };
      }

      mediaItems = await prisma.telegramMedia.findMany({
        where: whereClause,
        take: mode === "BATCH" ? batchSize : 500,
        orderBy: { messageId: "asc" },
      });
    }

    if (mediaItems.length === 0) {
      throw new Error("No eligible media items found to import.");
    }

    // Create TelegramImportJob
    const job = await prisma.telegramImportJob.create({
      data: {
        sourceId: source.id,
        status: "IDLE",
        mode,
        batchSize,
        maxFileSize,
        totalDiscovered: mediaItems.length,
        queued: mediaItems.length,
      },
    });

    // Create TelegramImportItem for each media item
    for (const m of mediaItems) {
      await prisma.telegramImportItem.create({
        data: {
          jobId: job.id,
          mediaId: m.id,
          status: "QUEUED",
        },
      });

      await prisma.telegramMedia.update({
        where: { id: m.id },
        data: { status: "QUEUED" },
      });
    }

    logger.info("TELEGRAM_IMPORTER", `Created Telegram Import Job ${job.id} with ${mediaItems.length} items`);

    // Dispatch background ingestion runner
    this.runJob(job.id, categoryId).catch((err) => {
      logger.error("TELEGRAM_IMPORTER", `Import job ${job.id} execution failed: ${err.message}`);
    });

    return job;
  }

  /**
   * Run import job with controlled concurrency and disk space protection.
   */
  static async runJob(jobId: string, categoryId?: string) {
    if (this.activeJobs.has(jobId)) {
      return;
    }

    this.activeJobs.add(jobId);

    try {
      await prisma.telegramImportJob.update({
        where: { id: jobId },
        data: { status: "RUNNING", startedAt: new Date(), errorMessage: null },
      });

      const concurrency = parseInt(process.env.TELEGRAM_DOWNLOAD_CONCURRENCY || "1", 10) || 1;

      while (true) {
        // Check if job was paused or cancelled by user
        const currentJob = await prisma.telegramImportJob.findUnique({
          where: { id: jobId },
        });

        if (!currentJob || currentJob.status === "PAUSED" || currentJob.status === "CANCELLED") {
          logger.info("TELEGRAM_IMPORTER", `Job ${jobId} was paused or cancelled`);
          break;
        }

        // Get next batch of queued items
        const pendingItems = await prisma.telegramImportItem.findMany({
          where: { jobId, status: "QUEUED" },
          take: concurrency,
          include: { media: true },
        });

        if (pendingItems.length === 0) {
          // No more items queued for this job
          await prisma.telegramImportJob.update({
            where: { id: jobId },
            data: { status: "COMPLETED", completedAt: new Date() },
          });
          logger.info("TELEGRAM_IMPORTER", `Job ${jobId} completed successfully`);
          break;
        }

        // Process items sequentially or in throttled concurrency
        for (const item of pendingItems) {
          // 1. Check disk space before each download
          const diskCheck = checkAvailableDiskSpace(undefined, Number(item.media.fileSizeBytes));
          if (!diskCheck.allowed) {
            await prisma.telegramImportJob.update({
              where: { id: jobId },
              data: {
                status: "PAUSED_STORAGE",
                errorMessage: diskCheck.message || "Insufficient storage space.",
              },
            });
            logger.warn("TELEGRAM_IMPORTER", `Job ${jobId} paused due to storage limit`);
            this.activeJobs.delete(jobId);
            return;
          }

          // 2. Mark item as DOWNLOADING
          await prisma.telegramImportItem.update({
            where: { id: item.id },
            data: { status: "DOWNLOADING" },
          });

          await this.updateJobCounters(jobId);

          // 3. Download media to staging
          const downloadResult = await downloadTelegramMediaItem(item.mediaId, jobId);

          if (!downloadResult.success) {
            await prisma.telegramImportItem.update({
              where: { id: item.id },
              data: {
                status: "FAILED",
                errorMessage: downloadResult.errorMessage || "Download failed",
                retryCount: { increment: 1 },
              },
            });
          } else if (downloadResult.isDuplicate) {
            await prisma.telegramImportItem.update({
              where: { id: item.id },
              data: { status: "DUPLICATE" },
            });
          } else if (downloadResult.localStagingPath) {
            // 4. Create Video record in database
            const rawTitle = item.media.fileName
              ? item.media.fileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ")
              : `Telegram Video ${item.media.messageId}`;

            let baseSlug = slugify(rawTitle) || `tg-${Date.now()}`;
            let uniqueSlug = baseSlug;
            let counter = 1;
            while (await prisma.video.findUnique({ where: { slug: uniqueSlug } })) {
              uniqueSlug = `${baseSlug}-${counter}`;
              counter++;
            }

            const video = await prisma.video.create({
              data: {
                title: rawTitle,
                slug: uniqueSlug,
                description: `Imported from Telegram channel message #${item.media.messageId}`,
                duration: item.media.duration || 0,
                fileSize: item.media.fileSizeBytes,
                contentHash: downloadResult.contentHash,
                source: "TELEGRAM",
                status: "QUEUED",
                isPublished: false,
                thumbnailUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
                categoryId: categoryId || null,
              },
            });

            // Associate media with video
            await prisma.telegramMedia.update({
              where: { id: item.mediaId },
              data: {
                status: "PROCESSING",
                videoId: video.id,
              },
            });

            await prisma.telegramImportItem.update({
              where: { id: item.id },
              data: { status: "PROCESSING" },
            });

            // 5. Enqueue into background transcode queue for dedicated worker
            await VideoJobQueue.enqueue(video.id, downloadResult.localStagingPath, "TELEGRAM_IMPORT");
          }

          await this.updateJobCounters(jobId);
        }
      }
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Recalculate job status metrics from database
   */
  static async updateJobCounters(jobId: string) {
    const [queued, downloading, downloaded, processing, ready, failed, duplicates, skipped] =
      await Promise.all([
        prisma.telegramImportItem.count({ where: { jobId, status: "QUEUED" } }),
        prisma.telegramImportItem.count({ where: { jobId, status: "DOWNLOADING" } }),
        prisma.telegramImportItem.count({ where: { jobId, status: "DOWNLOADED" } }),
        prisma.telegramImportItem.count({ where: { jobId, status: "PROCESSING" } }),
        prisma.telegramImportItem.count({ where: { jobId, status: "READY" } }),
        prisma.telegramImportItem.count({ where: { jobId, status: "FAILED" } }),
        prisma.telegramImportItem.count({ where: { jobId, status: "DUPLICATE" } }),
        prisma.telegramImportItem.count({ where: { jobId, status: "SKIPPED" } }),
      ]);

    await prisma.telegramImportJob.update({
      where: { id: jobId },
      data: {
        queued,
        downloading,
        downloaded,
        processing,
        ready,
        failed,
        duplicates,
        skipped,
      },
    });
  }

  /**
   * Pause a running job
   */
  static async pauseJob(jobId: string) {
    await prisma.telegramImportJob.update({
      where: { id: jobId },
      data: { status: "PAUSED" },
    });
    this.activeJobs.delete(jobId);
    return true;
  }

  /**
   * Resume a paused job
   */
  static async resumeJob(jobId: string) {
    const job = await prisma.telegramImportJob.findUnique({ where: { id: jobId } });
    if (!job) return false;

    await prisma.telegramImportJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", errorMessage: null },
    });

    this.runJob(jobId).catch(console.error);
    return true;
  }

  /**
   * Cancel an import job and cancel pending items
   */
  static async cancelJob(jobId: string) {
    await prisma.$transaction([
      prisma.telegramImportJob.update({
        where: { id: jobId },
        data: { status: "CANCELLED" },
      }),
      prisma.telegramImportItem.updateMany({
        where: { jobId, status: "QUEUED" },
        data: { status: "CANCELLED" },
      }),
    ]);

    this.activeJobs.delete(jobId);
    return true;
  }

  /**
   * Retry failed items in a job
   */
  static async retryFailed(jobId: string) {
    const failedItems = await prisma.telegramImportItem.findMany({
      where: { jobId, status: "FAILED" },
    });

    if (failedItems.length === 0) return 0;

    for (const item of failedItems) {
      await prisma.$transaction([
        prisma.telegramImportItem.update({
          where: { id: item.id },
          data: { status: "QUEUED", errorMessage: null },
        }),
        prisma.telegramMedia.update({
          where: { id: item.mediaId },
          data: { status: "QUEUED", errorMessage: null },
        }),
      ]);
    }

    await this.updateJobCounters(jobId);
    this.runJob(jobId).catch(console.error);
    return failedItems.length;
  }
}
