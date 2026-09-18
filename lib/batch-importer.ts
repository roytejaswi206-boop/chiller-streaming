import fs from "fs";
import path from "path";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export interface BatchItem {
  id: string;
  sourceFileId: string;
  title: string;
  fileSizeBytes: number;
  state: "PENDING" | "DOWNLOADING" | "HASHED" | "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "SKIPPED_DUPLICATE";
  contentHash?: string;
  videoId?: string;
  errorMessage?: string;
  retryCount: number;
  completedAt?: string;
}

export interface BatchJobState {
  id: string;
  name: string;
  source: string;
  total: number;
  queued: number;
  downloading: number;
  processing: number;
  ready: number;
  failed: number;
  skippedDuplicates: number;
  status: "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  items: BatchItem[];
}

const STATE_DIR = path.join(process.cwd(), "media_storage", "import_states");

/**
 * Enterprise Resumable Batch Import Manager
 * Tracks 10 to 50,000+ items across server restarts without losing progress.
 */
export class BatchImportManager {
  private static ensureStateDir() {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
  }

  private static getStateFilePath(jobId: string): string {
    this.ensureStateDir();
    return path.join(STATE_DIR, `batch_${jobId}.json`);
  }

  /**
   * Save batch job state to persistent disk storage
   */
  static saveState(job: BatchJobState): void {
    const filePath = this.getStateFilePath(job.id);
    job.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(job, null, 2), "utf-8");
  }

  /**
   * Load batch job state from persistent disk storage
   */
  static loadState(jobId: string): BatchJobState | null {
    const filePath = this.getStateFilePath(jobId);
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * List all active or historic batch import jobs
   */
  static listAllJobs(): BatchJobState[] {
    this.ensureStateDir();
    const files = fs.readdirSync(STATE_DIR).filter((f) => f.startsWith("batch_") && f.endsWith(".json"));
    const jobs: BatchJobState[] = [];

    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(STATE_DIR, f), "utf-8");
        jobs.push(JSON.parse(raw));
      } catch {
        // Skip corrupted files
      }
    }

    return jobs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Create a new resumable batch import job
   */
  static createBatchJob(name: string, source: string, initialItems: { sourceFileId: string; title: string; size?: number }[]): BatchJobState {
    const jobId = `import_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const items: BatchItem[] = initialItems.map((item, idx) => ({
      id: `${jobId}_item_${idx + 1}`,
      sourceFileId: item.sourceFileId,
      title: item.title,
      fileSizeBytes: item.size || 0,
      state: "PENDING",
      retryCount: 0,
    }));

    const job: BatchJobState = {
      id: jobId,
      name,
      source,
      total: items.length,
      queued: items.length,
      downloading: 0,
      processing: 0,
      ready: 0,
      failed: 0,
      skippedDuplicates: 0,
      status: "IDLE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items,
    };

    this.saveState(job);
    logger.info("IMPORT", `Created Batch Import Job [${jobId}] with ${items.length} items from ${source}`);
    return job;
  }

  /**
   * Pause a running batch job
   */
  static pauseJob(jobId: string): boolean {
    const job = this.loadState(jobId);
    if (!job) return false;

    job.status = "PAUSED";
    this.saveState(job);
    logger.info("IMPORT", `Batch Import Job [${jobId}] PAUSED`);
    return true;
  }

  /**
   * Resume a paused or interrupted batch job from its last successful state
   */
  static resumeJob(jobId: string): boolean {
    const job = this.loadState(jobId);
    if (!job) return false;

    job.status = "RUNNING";
    this.saveState(job);
    logger.info("IMPORT", `Batch Import Job [${jobId}] RESUMED from state`);
    return true;
  }

  /**
   * Retry failed items in a batch job
   */
  static retryFailed(jobId: string): number {
    const job = this.loadState(jobId);
    if (!job) return 0;

    let retried = 0;
    for (const item of job.items) {
      if (item.state === "FAILED") {
        item.state = "PENDING";
        item.errorMessage = undefined;
        item.retryCount++;
        retried++;
      }
    }

    job.failed -= retried;
    job.queued += retried;
    if (job.status === "COMPLETED") {
      job.status = "RUNNING";
    }

    this.saveState(job);
    logger.info("IMPORT", `Retried ${retried} failed items in Batch Job [${jobId}]`);
    return retried;
  }

  /**
   * Cancel a batch job
   */
  static cancelJob(jobId: string): boolean {
    const job = this.loadState(jobId);
    if (!job) return false;

    job.status = "CANCELLED";
    this.saveState(job);
    logger.info("IMPORT", `Batch Import Job [${jobId}] CANCELLED`);
    return true;
  }

  /**
   * Update item progress within a batch
   */
  static updateItemState(
    jobId: string,
    itemId: string,
    state: BatchItem["state"],
    meta?: { contentHash?: string; videoId?: string; errorMessage?: string }
  ): void {
    const job = this.loadState(jobId);
    if (!job) return;

    const item = job.items.find((i) => i.id === itemId);
    if (!item) return;

    item.state = state;
    if (meta?.contentHash) item.contentHash = meta.contentHash;
    if (meta?.videoId) item.videoId = meta.videoId;
    if (meta?.errorMessage) item.errorMessage = meta.errorMessage;
    if (state === "READY") item.completedAt = new Date().toISOString();

    // Recompute counters
    job.ready = job.items.filter((i) => i.state === "READY").length;
    job.failed = job.items.filter((i) => i.state === "FAILED").length;
    job.skippedDuplicates = job.items.filter((i) => i.state === "SKIPPED_DUPLICATE").length;
    job.processing = job.items.filter((i) => i.state === "PROCESSING" || i.state === "DOWNLOADING").length;
    job.queued = job.items.filter((i) => i.state === "PENDING" || i.state === "QUEUED").length;

    if (job.ready + job.failed + job.skippedDuplicates === job.total) {
      job.status = "COMPLETED";
    }

    this.saveState(job);
  }
}
