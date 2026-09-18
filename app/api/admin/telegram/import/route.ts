import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { TelegramImportManager } from "@/lib/telegram/importer";
import { serializeWithBigInt } from "@/lib/json-serializer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      sourceId,
      mode = "NEW_ONLY",
      batchSize = 50,
      maxFileSize,
      selectedMediaIds,
      categoryId,
    } = body;

    if (!sourceId) {
      return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
    }

    const job = await TelegramImportManager.createJob({
      sourceId,
      mode,
      batchSize: parseInt(batchSize, 10) || 50,
      maxFileSize: maxFileSize ? BigInt(maxFileSize) : undefined,
      selectedMediaIds,
      categoryId,
    });

    return NextResponse.json({
      success: true,
      job: serializeWithBigInt(job),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
