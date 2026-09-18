import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuthSession } from "@/lib/auth";
import { getAllowedImportRoots, validateImportPath } from "@/lib/security/path-validator";
import { prisma } from "@/lib/prisma";
import { VideoJobQueue } from "@/lib/queue";
import { BatchImportManager } from "@/lib/batch-importer";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".mov", ".webm", ".avi", ".m4v", ".flv", ".ts"]);

interface ScannedVideoFile {
  fullPath: string;
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  isDuplicate: boolean;
  duplicateId?: string;
  duplicateTitle?: string;
}

function scanDirectoryForVideos(dir: string, baseDir: string, maxFiles = 20000): ScannedVideoFile[] {
  const results: ScannedVideoFile[] = [];

  function walk(currentDir: string) {
    if (results.length >= maxFiles) return;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) break;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip hidden or system folders
        if (!entry.name.startsWith(".")) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          try {
            const stat = fs.statSync(fullPath);
            results.push({
              fullPath,
              relativePath: path.relative(baseDir, fullPath),
              fileName: entry.name,
              sizeBytes: stat.size,
              isDuplicate: false,
            });
          } catch {
            // Ignore unreadable files
          }
        }
      }
    }
  }

  walk(dir);
  return results;
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const allowedRoots = getAllowedImportRoots();
    return NextResponse.json({
      allowedRoots,
      defaultStagingPath: path.resolve(process.cwd(), "media_storage", "videos", "original"),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const { action = "scan", folderPath, duplicatePolicy = "skip", categoryId } = body;

    // Validate path security strictly
    const pathCheck = validateImportPath(folderPath);
    if (!pathCheck.valid || !pathCheck.resolvedPath) {
      return NextResponse.json(
        { error: pathCheck.error || "Security violation: Access to specified directory is denied" },
        { status: 400 }
      );
    }

    const resolvedDir = pathCheck.resolvedPath;

    // 1. Action: SCAN DIRECTORY
    if (action === "scan") {
      const scannedFiles = scanDirectoryForVideos(resolvedDir, resolvedDir);

      // Check for existing duplicates in database using processing jobs
      const existingJobs = await prisma.processingJob.findMany({
        select: { id: true, videoId: true, sourceFile: true, video: { select: { title: true } } },
      });

      const existingSourceFiles = new Set(
        existingJobs
          .filter((j) => j.sourceFile)
          .map((j) => path.resolve(j.sourceFile!).toLowerCase())
      );

      let duplicateCount = 0;
      let totalSizeBytes = 0;

      for (const f of scannedFiles) {
        totalSizeBytes += f.sizeBytes;
        const normalized = path.resolve(f.fullPath).toLowerCase();
        if (existingSourceFiles.has(normalized)) {
          f.isDuplicate = true;
          const match = existingJobs.find(
            (j) => j.sourceFile && path.resolve(j.sourceFile).toLowerCase() === normalized
          );
          if (match) {
            f.duplicateId = match.videoId;
            f.duplicateTitle = match.video?.title;
          }
          duplicateCount++;
        }
      }

      return NextResponse.json({
        success: true,
        folderPath: resolvedDir,
        totalFiles: scannedFiles.length,
        totalSizeBytes,
        duplicateCount,
        newFilesCount: scannedFiles.length - duplicateCount,
        files: scannedFiles.slice(0, 100), // Preview first 100
        hasMore: scannedFiles.length > 100,
      });
    }

    // 2. Action: IMPORT & ENQUEUE
    if (action === "import") {
      const scannedFiles = scanDirectoryForVideos(resolvedDir, resolvedDir);
      if (scannedFiles.length === 0) {
        return NextResponse.json(
          { error: "No video files found in the specified directory" },
          { status: 400 }
        );
      }

      // Check existing jobs to skip duplicates if policy is "skip"
      const existingJobs = await prisma.processingJob.findMany({
        select: { sourceFile: true },
      });
      const existingSourceFiles = new Set(
        existingJobs
          .filter((j) => j.sourceFile)
          .map((j) => path.resolve(j.sourceFile!).toLowerCase())
      );

      const filesToQueue = scannedFiles.filter((f) => {
        if (duplicatePolicy === "skip") {
          return !existingSourceFiles.has(path.resolve(f.fullPath).toLowerCase());
        }
        return true;
      });

      // Create batch job in BatchImportManager
      const batchJob = BatchImportManager.createBatchJob(
        `Local Folder: ${path.basename(resolvedDir)}`,
        resolvedDir,
        filesToQueue.map((f) => ({
          sourceFileId: f.fullPath,
          title: path.basename(f.fileName, path.extname(f.fileName)).replace(/[-_]+/g, " "),
          size: f.sizeBytes,
        }))
      );

      let enqueuedCount = 0;
      const errors: string[] = [];

      // Bulk enqueue into DB without running FFmpeg in web process
      for (const item of batchJob.items) {
        try {
          const rawTitle = item.title;
          let baseSlug = slugify(rawTitle) || `video-${Date.now()}`;
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
              description: `Bulk imported from server folder: ${path.basename(resolvedDir)}`,
              categoryId: categoryId || null,
              visibility: "PUBLIC",
              isPublished: false,
              status: "QUEUED",
              thumbnailUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
              fileSize: BigInt(item.fileSizeBytes),
              resolution: "Pending",
              codec: "Pending",
            },
          });

          await VideoJobQueue.enqueue(video.id, item.sourceFileId, "TRANSCODE");

          BatchImportManager.updateItemState(batchJob.id, item.id, "QUEUED", {
            videoId: video.id,
          });

          enqueuedCount++;
        } catch (err: any) {
          errors.push(`Failed to enqueue ${item.title}: ${err.message}`);
          BatchImportManager.updateItemState(batchJob.id, item.id, "FAILED", {
            errorMessage: err.message,
          });
        }
      }

      return NextResponse.json({
        success: true,
        batchId: batchJob.id,
        totalScanned: scannedFiles.length,
        skippedDuplicates: scannedFiles.length - filesToQueue.length,
        enqueuedCount,
        errors: errors.slice(0, 5),
        message: `Successfully registered and enqueued ${enqueuedCount} videos into the database transcoding queue. Start worker with 'npm run worker' to process HLS.`,
      });
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("Folder import API error:", err);
    return NextResponse.json({ error: `Folder import failed: ${err.message}` }, { status: 500 });
  }
}
