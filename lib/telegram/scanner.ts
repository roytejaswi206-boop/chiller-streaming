import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getConnectedTelegramClient } from "./client";

export interface ScanOptions {
  sourceTelegramId: string;
  sourceTitle?: string;
  sourceType?: string;
  sourceUsername?: string;
  batchSize?: number;
  maxFilesToScan?: number;
  resetCursor?: boolean;
}

export interface ScanResult {
  sourceId: string;
  scannedBatchCount: number;
  newDiscoveredCount: number;
  totalDiscovered: number;
  lastScannedId: number;
  hasMore: boolean;
}

const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".mov", ".webm", ".avi", ".m4v", ".flv", ".ts"];

/**
 * Resumable Telegram Scanner for large archives (10 to 10,000+ videos).
 * Scans messages in discrete batches, records metadata, checks Layer 1 & 2 duplicates,
 * and updates checkpoints in the database.
 */
export async function scanTelegramSource(options: ScanOptions): Promise<ScanResult> {
  const {
    sourceTelegramId,
    sourceTitle = "Telegram Source",
    sourceType = "CHANNEL",
    sourceUsername,
    batchSize = 50,
    maxFilesToScan = 100,
    resetCursor = false,
  } = options;

  const client = await getConnectedTelegramClient();

  // 1. Resolve or create TelegramSource in database
  let source = await prisma.telegramSource.findUnique({
    where: { telegramId: sourceTelegramId },
  });

  if (!source) {
    source = await prisma.telegramSource.create({
      data: {
        telegramId: sourceTelegramId,
        title: sourceTitle,
        username: sourceUsername || null,
        type: sourceType,
        lastScannedId: 0,
      },
    });
  } else if (resetCursor) {
    source = await prisma.telegramSource.update({
      where: { id: source.id },
      data: { lastScannedId: 0 },
    });
  }

  // Resolve target entity
  let targetEntity: any = sourceTelegramId;
  if (sourceTelegramId === "me" || sourceTelegramId === "self") {
    targetEntity = "me";
  } else if (/^-?\d+$/.test(sourceTelegramId)) {
    // Numeric chat or channel ID
    try {
      targetEntity = await client.getEntity(sourceTelegramId);
    } catch {
      targetEntity = sourceTelegramId;
    }
  }

  let offsetId = source.lastScannedId || 0;
  let newDiscoveredCount = 0;
  let totalScanned = 0;
  let hasMore = true;

  logger.info("TELEGRAM_SCANNER", `Starting scan for source "${source.title}" (ID: ${source.id}) from offsetId: ${offsetId}`);

  while (totalScanned < maxFilesToScan && hasMore) {
    const currentLimit = Math.min(batchSize, maxFilesToScan - totalScanned);

    const messages = await client.getMessages(targetEntity, {
      limit: currentLimit,
      offsetId: offsetId > 0 ? offsetId : undefined,
    });

    if (!messages || messages.length === 0) {
      hasMore = false;
      break;
    }

    let minMessageIdInBatch = offsetId;

    for (const msg of messages) {
      minMessageIdInBatch = msg.id;
      totalScanned++;

      // Identify if message contains a video or video document
      const isVideo = Boolean(msg.video);
      const isDocument = Boolean(msg.document);

      let isVideoMedia = isVideo;
      let fileName: string | null = null;
      let mimeType: string | null = null;
      let fileSizeBytes = BigInt(0);
      let duration = 0;
      let width: number | null = null;
      let height: number | null = null;
      let fileId: string | null = null;

      if (isVideo && msg.video) {
        fileSizeBytes = BigInt((msg.video as any).size || 0);
        duration = Math.round((msg.video as any).duration || 0);
        width = (msg.video as any).w || null;
        height = (msg.video as any).h || null;
        mimeType = (msg.video as any).mimeType || "video/mp4";
        fileName = `telegram_video_${msg.id}.mp4`;
        fileId = (msg.video as any).id ? String((msg.video as any).id) : null;
      } else if (isDocument && msg.document) {
        const doc: any = msg.document;
        mimeType = doc.mimeType || "";
        fileSizeBytes = BigInt(doc.size || 0);
        fileId = doc.id ? String(doc.id) : null;

        // Check attributes for filename and video properties
        if (Array.isArray(doc.attributes)) {
          for (const attr of doc.attributes) {
            if (attr.className === "DocumentAttributeFilename" && attr.fileName) {
              fileName = attr.fileName;
            }
            if (attr.className === "DocumentAttributeVideo") {
              isVideoMedia = true;
              duration = Math.round(attr.duration || 0);
              width = attr.w || null;
              height = attr.h || null;
            }
          }
        }

        if (
          (mimeType && mimeType.startsWith("video/")) ||
          (fileName && VIDEO_EXTENSIONS.some((ext) => fileName!.toLowerCase().endsWith(ext)))
        ) {
          isVideoMedia = true;
        }
      }

      if (!isVideoMedia || fileSizeBytes === BigInt(0)) {
        continue;
      }

      const messageDate = msg.date ? new Date(msg.date * 1000) : new Date();
      if (!fileName) {
        fileName = `video_${msg.id}.mp4`;
      }

      // Check Layer 1 & 2 duplicate in database
      const existingMedia = await prisma.telegramMedia.findUnique({
        where: {
          sourceId_messageId: {
            sourceId: source.id,
            messageId: msg.id,
          },
        },
      });

      if (!existingMedia) {
        await prisma.telegramMedia.create({
          data: {
            sourceId: source.id,
            messageId: msg.id,
            fileId,
            fileName,
            mimeType,
            fileSizeBytes,
            duration,
            width,
            height,
            messageDate,
            status: "DISCOVERED",
          },
        });
        newDiscoveredCount++;
      }
    }

    offsetId = minMessageIdInBatch;

    // Checkpoint progress to database
    await prisma.telegramSource.update({
      where: { id: source.id },
      data: {
        lastScannedId: offsetId,
        totalDiscovered: { increment: newDiscoveredCount },
        lastSyncedAt: new Date(),
      },
    });

    if (messages.length < currentLimit) {
      hasMore = false;
    }
  }

  // Final count of discovered media for this source
  const totalDiscovered = await prisma.telegramMedia.count({
    where: { sourceId: source.id },
  });

  return {
    sourceId: source.id,
    scannedBatchCount: totalScanned,
    newDiscoveredCount,
    totalDiscovered,
    lastScannedId: offsetId,
    hasMore,
  };
}
