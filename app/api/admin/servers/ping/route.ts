import { NextResponse } from "next/server";
import { auditAllOriginServers } from "@/lib/origin-health";

export async function POST() {
  try {
    const results = await auditAllOriginServers();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      servers: results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
