import { NextResponse } from "next/server";
import { getChillerVersionInfo } from "@/lib/config/version";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const versionInfo = getChillerVersionInfo();

  return NextResponse.json(versionInfo, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store",
    },
  });
}
