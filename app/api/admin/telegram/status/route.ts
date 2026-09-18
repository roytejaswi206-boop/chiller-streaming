import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getTelegramStatus } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get("refresh") === "true";

    const status = await getTelegramStatus(refresh);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({
      status: "ERROR",
      lastError: err.message,
      hasApiId: Boolean(process.env.TELEGRAM_API_ID),
      hasApiHash: Boolean(process.env.TELEGRAM_API_HASH),
      hasSession: Boolean(process.env.TELEGRAM_SESSION),
      hasBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    });
  }
}
