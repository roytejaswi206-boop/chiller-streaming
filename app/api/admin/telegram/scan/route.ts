import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { scanTelegramSource } from "@/lib/telegram/scanner";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      sourceTelegramId,
      sourceTitle,
      sourceType,
      sourceUsername,
      batchSize = 50,
      maxFilesToScan = 100,
      resetCursor = false,
    } = body;

    if (!sourceTelegramId) {
      return NextResponse.json({ error: "sourceTelegramId is required" }, { status: 400 });
    }

    const result = await scanTelegramSource({
      sourceTelegramId: String(sourceTelegramId),
      sourceTitle,
      sourceType,
      sourceUsername,
      batchSize: parseInt(batchSize, 10) || 50,
      maxFilesToScan: parseInt(maxFilesToScan, 10) || 100,
      resetCursor: Boolean(resetCursor),
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
