import { NextResponse } from "next/server";
import { playbackRegistry } from "@/lib/playback/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = playbackRegistry.getHealthStats();
    const providers = playbackRegistry.getAllProviders().map((p) => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      priority: p.priority,
      capabilities: p.getCapabilities(),
      health: p.getHealth(),
    }));

    return NextResponse.json({
      success: true,
      health,
      providers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load health metrics" },
      { status: 500 }
    );
  }
}
