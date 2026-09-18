import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getConnectedTelegramClient } from "./client";
import { checkAvailableDiskSpace } from "./disk-guard";

export interface DownloadResult {
  success: boolean;
  isDuplicate: boolean;
  localStagingPath?: string;
  contentHash?: string;
  duplicateOfVideoId?: string;
  errorMessage?: string;
}

/**
 * Downloads a Telegram media item to an isolated temporary staging directory,
 * checks available storage, calculates SHA-256, and executes Layer 3 duplicate detection.
 */
export async function downloadTelegramMediaItem(
  mediaId: string,
  jobId: string,
  onProgress?: (progressPct: number) => void
): Promise<DownloadResult> {
  const media = await prisma.telegramMedia.findUnique({
    where: { id: mediaId },
    include: { source: true },
  });

  if (!media) {
    return { success: false, isDuplicate: false, errorMessage: "TelegramMedia item not found." };
  }

  // 1. Check Available Disk Space with Safety Margin
  const diskCheck = checkAvailableDiskSpace(undefined, Number(media.fileSizeBytes));
  if (!diskCheck.allowed) {
    const err = diskCheck.message || "Insufficient storage space on host.";
    await prisma.telegramMedia.update({
      where: { id: media.id },
      data: { status: "FAILED", errorMessage: err },
    });
    return { success: false, isDuplicate: false, errorMessage: err };
  }

  // 2. Prepare Isolated Staging Directory: media_storage/tmp/telegram/{jobId}/{mediaId}/
  const stagingDir = path.join(process.cwd(), "media_storage", "tmp", "telegram", jobId, media.id);
  if (!fs.existsSync(stagingDir)) {
    fs.mkdirSync(stagingDir, { recursive: true });
  }

  const cleanFileName = (media.fileName || `telegram_${media.messageId}.mp4`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const localStagingPath = path.join(stagingDir, cleanFileName);

  // 3. Mark state as DOWNLOADING
  await prisma.telegramMedia.update({
    where: { id: media.id },
    data: { status: "DOWNLOADING", downloadProgress: 0, errorMessage: null },
  });

  try {
    const client = await getConnectedTelegramClient();

    // Resolve target entity
    let targetEntity: any = media.source.telegramId;
    if (targetEntity === "me" || targetEntity === "self") {
      targetEntity = "me";
    } else if (/^-?\d+$/.test(targetEntity)) {
      try {
        targetEntity = await client.getEntity(targetEntity);
      } catch {
        targetEntity = media.source.telegramId;
      }
    }

    const messages = await client.getMessages(targetEntity, {
      ids: [media.messageId],
    });

    const targetMsg = messages?.[0];
    if (!targetMsg || (!targetMsg.video && !targetMsg.document)) {
      throw new Error(`Media message ${media.messageId} no longer accessible on Telegram.`);
    }

    logger.info("TELEGRAM_DOWNLOADER", `Downloading message ${media.messageId} (${media.fileName}) to ${localStagingPath}`);

    // Download to disk with chunked progress callback
    await client.downloadMedia(targetMsg, {
      outputFile: localStagingPath,
      progressCallback: async (downloaded: any, total: any) => {
        const totalBytes = Number(total || media.fileSizeBytes || 1);
        const downloadedBytes = Number(downloaded || 0);
        const progressPct = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));

        if (onProgress) onProgress(progressPct);
      },
    });

    if (!fs.existsSync(localStagingPath)) {
      throw new Error("Download completed but destination file was not written.");
    }

    // 4. Compute SHA-256 hash using streamed chunks
    const hash = crypto.createHash("sha256");
    const fileStream = fs.createReadStream(localStagingPath);
    for await (const chunk of fileStream) {
      hash.update(chunk);
    }
    const contentHash = hash.digest("hex");

    // 5. Layer 3 Duplicate Detection against existing Velora Video catalog
    const existingVideo = await prisma.video.findFirst({
      where: { contentHash },
      select: { id: true, title: true },
    });

    if (existingVideo) {
      logger.info("TELEGRAM_DOWNLOADER", `Duplicate content hash detected for ${media.fileName}. Matches Video ${existingVideo.id}`);

      // Clean up temporary file immediately
      try {
        fs.unlinkSync(localStagingPath);
        fs.rmdirSync(stagingDir);
      } catch {
        // Non-fatal
      }

      await prisma.telegramMedia.update({
        where: { id: media.id },
        data: {
          status: "DUPLICATE",
          contentHash,
          downloadProgress: 100,
          videoId: existingVideo.id,
        },
      });

      return {
        success: true,
        isDuplicate: true,
        contentHash,
        duplicateOfVideoId: existingVideo.id,
      };
    }

    // 6. Mark item as DOWNLOADED & Staged
    await prisma.telegramMedia.update({
      where: { id: media.id },
      data: {
        status: "DOWNLOADED",
        contentHash,
        downloadProgress: 100,
        localStagingPath,
      },
    });

    return {
      success: true,
      isDuplicate: false,
      localStagingPath,
      contentHash,
    };
  } catch (err: any) {
    logger.error("TELEGRAM_DOWNLOADER", `Failed to download media ${media.id}: ${err.message}`);

    // Cleanup partial files if any
    if (fs.existsSync(localStagingPath)) {
      try {
        fs.unlinkSync(localStagingPath);
      } catch {}
    }

    await prisma.telegramMedia.update({
      where: { id: media.id },
      data: {
        status: "FAILED",
        errorMessage: err.message,
        retryCount: { increment: 1 },
      },
    });

    return {
      success: false,
      isDuplicate: false,
      errorMessage: err.message,
    };
  }
}
