import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/rbac";
import { getSuperAdminStats } from "@/lib/analytics/tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const stats = await getSuperAdminStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { error: "Failed to load usage statistics" },
      { status: 500 }
    );
  }
}
