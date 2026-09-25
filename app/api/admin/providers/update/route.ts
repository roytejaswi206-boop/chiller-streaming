import { NextResponse } from "next/server";
import { playbackRegistry } from "@/lib/playback/registry";
import { requireAdmin } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const { action, providerId, enabled, priority } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: "Action is required." }, { status: 400 });
    }

    if (action === "resetHealth") {
      playbackRegistry.resetProviderHealth(providerId || undefined);
      return NextResponse.json({
        success: true,
        message: providerId ? `Health metrics reset for ${providerId}` : "All provider health metrics reset.",
      });
    }

    if (!providerId) {
      return NextResponse.json({ success: false, message: "providerId is required." }, { status: 400 });
    }

    const provider = playbackRegistry.getProvider(providerId);
    if (!provider) {
      return NextResponse.json({ success: false, message: `Provider '${providerId}' not found.` }, { status: 404 });
    }

    if (action === "toggleEnabled" || action === "setEnabled") {
      const targetEnabled = typeof enabled === "boolean" ? enabled : !provider.enabled;
      playbackRegistry.setProviderEnabled(providerId, targetEnabled);
      return NextResponse.json({
        success: true,
        providerId,
        enabled: targetEnabled,
        message: `Provider ${provider.name} ${targetEnabled ? "enabled" : "disabled"}.`,
      });
    }

    if (action === "setPriority") {
      const targetPriority = Number(priority);
      if (isNaN(targetPriority) || targetPriority < 1) {
        return NextResponse.json({ success: false, message: "Valid positive priority required." }, { status: 400 });
      }
      playbackRegistry.setProviderPriority(providerId, targetPriority);
      return NextResponse.json({
        success: true,
        providerId,
        priority: targetPriority,
        message: `Provider ${provider.name} priority set to ${targetPriority}.`,
      });
    }

    return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to update provider" }, { status: 500 });
  }
}
