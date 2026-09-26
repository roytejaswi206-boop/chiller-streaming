import { NextRequest, NextResponse } from "next/server";
import { cdnRouter, cdnHealth, getRegisteredCdnNodes, CdnHealthState } from "@/lib/cdn";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const snapshot = cdnRouter.getOperationalSnapshot();
    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve CDN health" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, cdnId, status, reason } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: "Action is required" }, { status: 400 });
    }

    if (action === "simulate-failure") {
      const targetId = cdnId || "cdn-primary";
      cdnHealth.forceSetStatus(targetId, "COOLDOWN", reason || "Simulated test outage");
      cdnRouter.reportCdnFailure(targetId, reason || "Controlled simulation failure");

      return NextResponse.json({
        success: true,
        message: `Simulated failure triggered for ${targetId}`,
        updatedHealth: cdnHealth.getMetrics(targetId),
        activeNode: cdnRouter.getHealthyCdn(),
      });
    }

    if (action === "recover") {
      const targetId = cdnId || "cdn-primary";
      cdnHealth.forceSetStatus(targetId, "HEALTHY");
      cdnRouter.reportCdnSuccess(targetId, 25);

      return NextResponse.json({
        success: true,
        message: `Node ${targetId} recovered and returned to active pool`,
        updatedHealth: cdnHealth.getMetrics(targetId),
      });
    }

    if (action === "probe") {
      const nodes = getRegisteredCdnNodes();
      const results = await Promise.all(
        nodes.map(async (node) => {
          const res = await cdnHealth.probeNode(node);
          return {
            cdnId: node.id,
            name: node.name,
            ...res,
          };
        })
      );

      return NextResponse.json({
        success: true,
        probeResults: results,
        snapshot: cdnRouter.getOperationalSnapshot(),
      });
    }

    if (action === "reset") {
      cdnHealth.resetAll();
      return NextResponse.json({
        success: true,
        message: "All CDN metrics and circuit breakers reset",
        snapshot: cdnRouter.getOperationalSnapshot(),
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Action failed" },
      { status: 500 }
    );
  }
}
