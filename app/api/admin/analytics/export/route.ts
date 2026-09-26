import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/rbac";
import { generateAnalyticsCsv } from "@/lib/analytics/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "visitors") as any;

    const csvContent = await generateAnalyticsCsv(type);
    const filename = `chiller-${type}-analytics-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to export CSV" },
      { status: 500 }
    );
  }
}
