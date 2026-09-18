import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const formData = await req.formData();
    const chunk = formData.get("chunk") as File;
    const uploadId = (formData.get("uploadId") as string)?.replace(/[^a-zA-Z0-9_-]/g, "");
    const chunkIndex = parseInt(formData.get("chunkIndex") as string, 10);
    const totalChunks = parseInt(formData.get("totalChunks") as string, 10);

    if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json({ error: "Missing or malformed chunk upload parameters" }, { status: 400 });
    }

    const tempUploadDir = path.join(process.cwd(), "media_storage", "temp_uploads", uploadId);
    if (!fs.existsSync(tempUploadDir)) {
      fs.mkdirSync(tempUploadDir, { recursive: true });
    }

    const chunkPath = path.join(tempUploadDir, `chunk_${chunkIndex.toString().padStart(5, "0")}`);
    const buffer = Buffer.from(await chunk.arrayBuffer());
    await fs.promises.writeFile(chunkPath, buffer);

    return NextResponse.json({
      success: true,
      uploadId,
      chunkIndex,
      totalChunks,
      receivedBytes: buffer.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Chunk upload failed: ${err.message}` }, { status: 500 });
  }
}
