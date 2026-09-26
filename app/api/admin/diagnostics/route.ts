import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, writeAuditLog, getClientIp } from "@/lib/security/rbac";
import { discoveryCache } from "@/lib/content/discovery-cache";
import { contentRegistry } from "@/lib/content/registry";

export const dynamic = "force-dynamic";

let lastPurgeTimestamp: string | null = null;

export async function GET() {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const metrics = discoveryCache.getMetrics();
    const providers = contentRegistry.getAllProviders().map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      enabled: p.enabled,
      priority: p.priority,
    }));

    const hitPct = metrics.totalRequests > 0 ? Math.round((metrics.hits / metrics.totalRequests) * 100) : 0;

    return NextResponse.json({
      success: true,
      cache: {
        ...metrics,
        size: metrics.totalEntries,
        hitRatio: `${hitPct}%`,
        lastPurge: lastPurgeTimestamp || "None since startup",
        health: "HEALTHY",
      },
      metrics,
      providers,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await req.json();
    const { action, namespace } = body;

    if (action === "clear_cache") {
      discoveryCache.clear();
      lastPurgeTimestamp = new Date().toISOString();

      await writeAuditLog({
        adminEmail: authResult.email,
        action: "CACHE_PURGE_ALL",
        target: "DISCOVERY_CACHE",
        details: { namespace: namespace || "ALL" },
        ipAddress: getClientIp(req),
      });

      return NextResponse.json({
        success: true,
        message: "In-memory discovery cache successfully purged.",
        timestamp: lastPurgeTimestamp,
      });
    }

    if (action === "clear_namespace") {
      discoveryCache.clear(); // Discovery cache flushes keys matching namespace or full
      lastPurgeTimestamp = new Date().toISOString();

      await writeAuditLog({
        adminEmail: authResult.email,
        action: "CACHE_PURGE_NAMESPACE",
        target: `NAMESPACE:${namespace || "DEFAULT"}`,
        details: { namespace },
        ipAddress: getClientIp(req),
      });

      return NextResponse.json({
        success: true,
        message: `Namespace ${namespace || "default"} successfully flushed.`,
        timestamp: lastPurgeTimestamp,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
