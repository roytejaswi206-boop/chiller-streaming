/**
 * app/api/ads/event/route.ts
 *
 * CHILLER — Ad Event Telemetry API
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Non-blocking telemetry ingestion
    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
