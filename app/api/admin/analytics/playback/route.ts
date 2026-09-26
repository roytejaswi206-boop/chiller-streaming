import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/rbac";
import { getPlaybackAndProviderHealth } from "@/lib/analytics/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const health = await getPlaybackAndProviderHealth();
    return NextResponse.json({ success: true, ...health });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load playback telemetry" },
      { status: 500 }
    );
  }
}
