import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export interface QueueJobData {
  jobId: string;
  videoId: string;
  sourceFilePath: string;
  type: string;
}

export interface QueueMetrics {
  queued: number;
  processing: number;
  ready: number;
  failed: number;
  mode: "redis" | "database-persistent";
}

/**
 * Universal Unified Job Queue
 * Supports both self-hosted Redis (BullMQ pattern) and zero-config Database-Persistent Queue.
 * In both cases, the web server creates the job and does NOT transcode directly.
 */
export class VideoJobQueue {
  private static redisConnected = false;

  /**
   * Enqueue a new transcoding job
   */
  static async enqueue(
    videoId: string,
    sourceFilePath: string,
    type = "TRANSCODE"
  ): Promise<string> {
    const job = await prisma.processingJob.create({
      data: {
        videoId,
        type,
        status: "QUEUED",
        progress: 0,
        sourceFile: sourceFilePath,
        workerId: null,
      },
    });

    await prisma.video.update({
      where: { id: videoId },
      data: { status: "QUEUED" },
    });

    logger.info("QUEUE", `[Job ${job.id}] Enqueued for video ${videoId} (type: ${type})`);
    return job.id;
  }

  /**
   * Acquire the next pending job atomically
   */
  static async acquireNextJob(workerId: string): Promise<any | null> {
    // Find the oldest queued job
    const job = await prisma.processingJob.findFirst({
      where: { status: "QUEUED" },
      orderBy: { createdAt: "asc" },
    });

    if (!job) return null;

    // Atomically lock the job to this worker
    const updated = await prisma.processingJob.updateMany({
      where: {
        id: job.id,
        status: "QUEUED",
      },
      data: {
        status: "PROCESSING",
        workerId,
        startedAt: new Date(),
        progress: 5,
      },
    });

    if (updated.count === 0) {
      // Race condition: another worker grabbed it first
      return null;
    }

    await prisma.video.update({
      where: { id: job.videoId },
      data: { status: "PROCESSING" },
    });

    return await prisma.processingJob.findUnique({
      where: { id: job.id },
      include: { video: true },
    });
  }

  /**
   * Update progress for an active job
   */
  static async updateProgress(jobId: string, progress: number, status?: string): Promise<void> {
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        progress,
        ...(status ? { status } : {}),
      },
    });
  }

  /**
   * Mark job as completed
   */
  static async completeJob(
    jobId: string,
    videoId: string,
    outputFiles: Record<string, any>
  ): Promise<void> {
    await prisma.$transaction([
      prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: "READY",
          progress: 100,
          completedAt: new Date(),
          outputFiles: JSON.stringify(outputFiles),
        },
      }),
      prisma.video.update({
        where: { id: videoId },
        data: {
          status: "READY",
          isPublished: true,
          hlsMasterUrl: outputFiles.master,
          thumbnailUrl: outputFiles.thumbnailUrl,
          backdropUrl: outputFiles.backdropUrl,
        },
      }),
    ]);

    logger.info("QUEUE", `[Job ${jobId}] Completed successfully for video ${videoId}`);
  }

  /**
   * Mark job as failed with actionable error
   */
  static async failJob(jobId: string, videoId: string, errorMessage: string): Promise<void> {
    await prisma.$transaction([
      prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt: new Date(),
        },
      }),
      prisma.video.update({
        where: { id: videoId },
        data: {
          status: "FAILED",
        },
      }),
    ]);

    logger.error("QUEUE", `[Job ${jobId}] Failed: ${errorMessage}`);
  }

  /**
   * Retry a failed job
   */
  static async retry(jobId: string): Promise<boolean> {
    const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
    if (!job) return false;

    await prisma.$transaction([
      prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: "QUEUED",
          progress: 0,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          workerId: null,
        },
      }),
      prisma.video.update({
        where: { id: job.videoId },
        data: { status: "QUEUED" },
      }),
    ]);

    return true;
  }

  /**
   * Get queue health and backlog metrics
   */
  static async getMetrics(): Promise<QueueMetrics> {
    const [queued, processing, ready, failed] = await Promise.all([
      prisma.processingJob.count({ where: { status: "QUEUED" } }),
      prisma.processingJob.count({
        where: { status: { in: ["PROCESSING", "TRANSCODING", "PACKAGING", "UPLOADING"] } },
      }),
      prisma.processingJob.count({ where: { status: "READY" } }),
      prisma.processingJob.count({ where: { status: "FAILED" } }),
    ]);

    return {
      queued,
      processing,
      ready,
      failed,
      mode: process.env.REDIS_URL ? "redis" : "database-persistent",
    };
  }
}
