import { NextRequest, NextResponse } from "next/server";
import { contentRegistry } from "@/lib/content/registry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { providerId } = await req.json();

    if (!providerId) {
      return NextResponse.json({ success: false, error: "providerId is required" }, { status: 400 });
    }

    const provider = contentRegistry.getProvider(providerId);
    if (!provider) {
      return NextResponse.json({ success: false, error: `Provider ${providerId} not found` }, { status: 404 });
    }

    const start = Date.now();
    const health = await provider.healthCheck();
    const latencyMs = health.latencyMs || Date.now() - start;

    if (health.status === "NOT_CONFIGURED" || health.status === "DISABLED") {
      return NextResponse.json({
        success: false,
        status: "NOT_CONFIGURED",
        latencyMs,
        message: health.message || "Provider API key or credentials not configured.",
      });
    }

    if (health.status === "ACTIVE") {
      return NextResponse.json({
        success: true,
        status: "PASS",
        latencyMs,
        message: health.message || `Provider responded successfully (${latencyMs}ms)`,
      });
    }

    return NextResponse.json({
      success: false,
      status: "FAIL",
      latencyMs,
      message: health.message || `Provider returned status: ${health.status}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, status: "FAIL", message: error.message || "Internal test error" },
      { status: 500 }
    );
  }
}
