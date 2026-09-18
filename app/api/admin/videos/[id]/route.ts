import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, visibility, isPublished, isFeatured } = body;

    const updated = await prisma.video.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(visibility !== undefined ? { visibility } : {}),
        ...(isPublished !== undefined ? { isPublished } : {}),
        ...(isFeatured !== undefined ? { isFeatured } : {}),
      },
    });

    return NextResponse.json({ success: true, video: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const { id } = await params;
    const video = await prisma.video.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Clean up HLS directory if it exists
    const hlsDir = path.join(process.cwd(), "media_storage", "videos", "hls", video.id);
    if (fs.existsSync(hlsDir)) {
      try {
        await fs.promises.rm(hlsDir, { recursive: true, force: true });
      } catch {
        // Non-fatal
      }
    }

    // Delete database records cascading
    await prisma.$transaction([
      prisma.videoVariant.deleteMany({ where: { videoId: id } }),
      prisma.processingJob.deleteMany({ where: { videoId: id } }),
      prisma.watchHistory.deleteMany({ where: { videoId: id } }),
      prisma.watchlist.deleteMany({ where: { videoId: id } }),
      prisma.favorite.deleteMany({ where: { videoId: id } }),
      prisma.viewEvent.deleteMany({ where: { videoId: id } }),
      prisma.videoOrigin.deleteMany({ where: { videoId: id } }),
      prisma.video.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
