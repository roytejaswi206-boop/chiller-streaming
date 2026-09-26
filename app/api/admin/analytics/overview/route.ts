import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/rbac";
import { getSuperAdminAnalytics } from "@/lib/analytics/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get("range") || "today") as any;
    const customStart = searchParams.get("start") || undefined;
    const customEnd = searchParams.get("end") || undefined;

    const analytics = await getSuperAdminAnalytics(range, customStart, customEnd);
    return NextResponse.json({ success: true, ...analytics });
  } catch (err: any) {
    console.error("[ADMIN_ANALYTICS_OVERVIEW_ERROR]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to compute analytics" },
      { status: 500 }
    );
  }
}
