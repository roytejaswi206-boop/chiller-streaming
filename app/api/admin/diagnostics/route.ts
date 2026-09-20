import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { discoveryCache } from "@/lib/content/discovery-cache";
import { contentRegistry } from "@/lib/content/registry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Optional check: in dev mode allow reading diagnostic metrics
    const metrics = discoveryCache.getMetrics();
    const providers = contentRegistry.getAllProviders().map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      enabled: p.enabled,
      priority: p.priority,
    }));

    return NextResponse.json({
      success: true,
      metrics,
      providers,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    if (body.action === "clear_cache") {
      discoveryCache.clear();
      return NextResponse.json({ success: true, message: "Discovery cache cleared." });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
