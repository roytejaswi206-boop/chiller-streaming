import { NextResponse } from "next/server";
import { defaultStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const provider = process.env.STORAGE_PROVIDER || "local";
    const localPath = process.env.LOCAL_STORAGE_PATH || "./media_storage";
    const testKey = "system_health_probe.tmp";

    // Test write and delete
    await defaultStorage.upload(testKey, Buffer.from("probe"));
    const exists = await defaultStorage.exists(testKey);
    await defaultStorage.delete(testKey);

    return NextResponse.json({
      status: exists ? "UP" : "DEGRADED",
      provider,
      storagePath: localPath,
      readWriteVerified: exists,
    });
  } catch (err: any) {
    return NextResponse.json({ status: "DOWN", error: err.message }, { status: 500 });
  }
}
