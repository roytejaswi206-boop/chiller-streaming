import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { VideoJobQueue } from "@/lib/queue";
import { slugify } from "@/lib/utils";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      uploadId,
      fileName,
      totalChunks,
      title,
      description,
      categoryId,
      visibility = "PUBLIC",
      isFeatured = false,
      duplicatePolicy = "skip",
    } = body;

    const safeUploadId = (uploadId || "").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeUploadId || !fileName || !totalChunks || !title) {
      return NextResponse.json(
        { error: "Missing required fields: uploadId, fileName, totalChunks, title" },
        { status: 400 }
      );
    }

    const tempDir = path.join(process.cwd(), "media_storage", "temp_uploads", safeUploadId);
    if (!fs.existsSync(tempDir)) {
      return NextResponse.json(
        { error: "Upload session not found or expired on server" },
        { status: 404 }
      );
    }

    // Verify all chunks exist
    for (let i = 0; i < totalChunks; i++) {
      const chunkFile = path.join(tempDir, `chunk_${i.toString().padStart(5, "0")}`);
      if (!fs.existsSync(chunkFile)) {
        return NextResponse.json(
          { error: `Missing chunk ${i} of ${totalChunks}. Please resume or retry upload.` },
          { status: 400 }
        );
      }
    }

    // Destination for raw original video
    const originalDir = path.join(process.cwd(), "media_storage", "videos", "original");
    if (!fs.existsSync(originalDir)) {
      fs.mkdirSync(originalDir, { recursive: true });
    }

    const ext = path.extname(fileName) || ".mp4";
    const timestamp = Date.now();
    const baseClean = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const targetFileName = `${timestamp}_${baseClean}${ext}`;
    const targetFilePath = path.join(originalDir, targetFileName);

    // Stream-merge chunks into target file and compute SHA-256 simultaneously
    const writeStream = fs.createWriteStream(targetFilePath);
    const hash = crypto.createHash("sha256");

    let totalMergedBytes = 0;

    for (let i = 0; i < totalChunks; i++) {
      const chunkFile = path.join(tempDir, `chunk_${i.toString().padStart(5, "0")}`);
      const chunkBuffer = await fs.promises.readFile(chunkFile);
      totalMergedBytes += chunkBuffer.length;
      hash.update(chunkBuffer);
      writeStream.write(chunkBuffer);
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end((err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const contentHash = hash.digest("hex");

    // Clean up temporary chunks directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Non-fatal cleanup
    }

    // Check for duplicate video
    const existingVideo = await prisma.video.findFirst({
      where: { contentHash },
      select: { id: true, title: true, publicId: true, slug: true, status: true },
    });

    if (existingVideo && duplicatePolicy === "skip") {
      return NextResponse.json({
        warning: `Duplicate video detected with identical content hash: ${contentHash.slice(0, 12)}...`,
        duplicateVideo: existingVideo,
        status: existingVideo.status,
      });
    }

    // Generate unique slug
    let baseSlug = slugify(title) || `video-${Date.now()}`;
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await prisma.video.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create database video record
    const video = await prisma.video.create({
      data: {
        title: title.trim(),
        slug: uniqueSlug,
        description: description?.trim() || null,
        categoryId: categoryId || null,
        visibility: visibility || "PUBLIC",
        isFeatured: Boolean(isFeatured),
        isPublished: false, // published once worker finishes transcoding
        status: "QUEUED",
        thumbnailUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
        backdropUrl: null,
        contentHash,
        fileSize: BigInt(totalMergedBytes),
        resolution: "Pending",
        codec: "Pending",
      },
    });

    // Enqueue transcoding job for the external worker (FFmpeg runs in worker.ts ONLY)
    const jobId = await VideoJobQueue.enqueue(video.id, targetFilePath, "TRANSCODE");

    return NextResponse.json({
      success: true,
      jobId,
      video: {
        id: video.id,
        publicId: video.publicId,
        slug: video.slug,
        title: video.title,
        status: "QUEUED",
      },
      bytesProcessed: totalMergedBytes,
      contentHash,
    });
  } catch (err: any) {
    console.error("Complete upload error:", err);
    return NextResponse.json(
      { error: `Failed to assemble and enqueue video: ${err.message}` },
      { status: 500 }
    );
  }
}
