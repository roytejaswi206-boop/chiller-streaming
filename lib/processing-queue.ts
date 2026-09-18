import { VideoJobQueue } from "@/lib/queue";

/**
 * Processing Queue Adapter
 * Provides backward-compatible interface delegating to the universal VideoJobQueue
 */
export class ProcessingQueue {
  /**
   * Enqueue a new processing job for a video
   */
  static async enqueue(videoId: string, sourceFilePath: string, type = "TRANSCODE"): Promise<string> {
    return await VideoJobQueue.enqueue(videoId, sourceFilePath, type);
  }

  /**
   * Retry a failed job
   */
  static async retry(jobId: string): Promise<boolean> {
    return await VideoJobQueue.retry(jobId);
  }

  /**
   * Cancel a job
   */
  static async cancel(jobId: string): Promise<boolean> {
    const { prisma } = await import("@/lib/prisma");
    const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
    if (!job) return false;

    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: "CANCELLED", completedAt: new Date() },
    });

    return true;
  }
}
