import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listAuthorizedSources } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    // 1. Fetch live sources from Telegram account
    let liveSources: any[] = [];
    try {
      liveSources = await listAuthorizedSources();
    } catch {
      // If Telegram is not connected, we still return saved sources from DB
    }

    // 2. Fetch saved sources from database with stats
    const dbSources = await prisma.telegramSource.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            media: true,
          },
        },
      },
    });

    return NextResponse.json({
      liveSources,
      savedSources: dbSources.map((s) => ({
        id: s.id,
        telegramId: s.telegramId,
        title: s.title,
        username: s.username,
        type: s.type,
        lastScannedId: s.lastScannedId,
        totalDiscovered: s.totalDiscovered,
        totalImported: s.totalImported,
        autoSync: s.autoSync,
        lastSyncedAt: s.lastSyncedAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
