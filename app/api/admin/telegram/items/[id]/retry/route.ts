import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TelegramImportManager } from "@/lib/telegram/importer";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const { id } = await params;

    // Retry item by reset to QUEUED
    const item = await prisma.telegramImportItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

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

    // Resume the parent job
    TelegramImportManager.runJob(item.jobId).catch(console.error);

    return NextResponse.json({ success: true, retriedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
