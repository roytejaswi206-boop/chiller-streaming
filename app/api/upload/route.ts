import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import axios from "axios";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { ProcessingQueue } from "@/lib/processing-queue";
import { checkDuplicate, computeContentHash, inspectVideo } from "@/lib/video-processor";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    // Optional check: allow admin or authorized callers
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";

    // 1. JSON Payload: Remote Authorized URL Import
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { sourceUrl, title, description, categoryId, isFeatured } = body;

      if (!sourceUrl || !title) {
        return NextResponse.json(
          { error: "Source URL and title are required" },
          { status: 400 }
        );
      }

      logger.info("API", `Starting remote URL import for "${title}" from ${sourceUrl}`);

      // Setup temp storage
      const tempDir = path.join(process.cwd(), "public", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempFileName = `remote_${Date.now()}_${path.basename(sourceUrl).split("?")[0] || "video.mp4"}`;
      const tempFilePath = path.join(tempDir, tempFileName);

      // Download file to temp storage
      const writer = fs.createWriteStream(tempFilePath);
      const response = await axios({
        method: "GET",
        url: sourceUrl,
        responseType: "stream",
        timeout: 60000,
      });

      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on("finish", () => resolve(true));
        writer.on("error", reject);
      });

      // Inspect metadata and hash
      const meta = await inspectVideo(tempFilePath);
      const hash = await computeContentHash(tempFilePath);

      // Duplicate detection
      const duplicate = await checkDuplicate(hash, meta.duration);
      if (duplicate) {
        // Clean up temp file
        fs.unlinkSync(tempFilePath);
        return NextResponse.json({
          warning: "Duplicate detected",
          duplicateVideoId: duplicate.id,
          duplicateTitle: duplicate.title,
        });
      }

      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

      const video = await prisma.video.create({
        data: {
          title,
          slug,
          description: description || null,
          duration: meta.duration,
          resolution: meta.resolution,
          fps: meta.fps,
          codec: meta.codec,
          fileSize: BigInt(meta.fileSize),
          contentHash: hash,
          thumbnailUrl: "/images/placeholder.jpg",
          status: "QUEUED",
          categoryId: categoryId || null,
          isFeatured: Boolean(isFeatured),
        },
      });

      // Dispatch to background processing queue
      const jobId = await ProcessingQueue.enqueue(video.id, tempFilePath, "REMOTE_IMPORT");

      return NextResponse.json({
        success: true,
        videoId: video.id,
        slug: video.slug,
        jobId,
        metadata: meta,
      });
    }

    // 2. Multi-part Form Data: Direct File Upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const title = (formData.get("title") as string) || "Untitled Upload";
      const description = formData.get("description") as string;
      const categoryId = formData.get("categoryId") as string;
      const isFeatured = formData.get("isFeatured") === "true";

      if (!file) {
        return NextResponse.json({ error: "No video file provided" }, { status: 400 });
      }

      const tempDir = path.join(process.cwd(), "public", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempFileName = `upload_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const tempFilePath = path.join(tempDir, tempFileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.promises.writeFile(tempFilePath, buffer);

      // Inspect metadata and hash
      const meta = await inspectVideo(tempFilePath);
      const hash = await computeContentHash(tempFilePath);

      // Duplicate check
      const duplicate = await checkDuplicate(hash, meta.duration);
      if (duplicate) {
        fs.unlinkSync(tempFilePath);
        return NextResponse.json({
          warning: "Duplicate detected",
          duplicateVideoId: duplicate.id,
          duplicateTitle: duplicate.title,
        });
      }

      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

      const video = await prisma.video.create({
        data: {
          title,
          slug,
          description: description || null,
          duration: meta.duration,
          resolution: meta.resolution,
          fps: meta.fps,
          codec: meta.codec,
          fileSize: BigInt(meta.fileSize),
          contentHash: hash,
          thumbnailUrl: "/images/placeholder.jpg",
          status: "QUEUED",
          categoryId: categoryId || null,
          isFeatured,
        },
      });

      const jobId = await ProcessingQueue.enqueue(video.id, tempFilePath, "TRANSCODE");

      return NextResponse.json({
        success: true,
        videoId: video.id,
        slug: video.slug,
        jobId,
        metadata: meta,
      });
    }

    return NextResponse.json({ error: "Unsupported media content-type" }, { status: 415 });
  } catch (err: any) {
    logger.error("API", `Upload failed: ${err.message}`);
    return NextResponse.json({ error: err.message || "Failed to process video upload" }, { status: 500 });
  }
}
