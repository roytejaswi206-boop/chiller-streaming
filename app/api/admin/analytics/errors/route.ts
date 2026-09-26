import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/rbac";
import { getGroupedErrors } from "@/lib/analytics/engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const grouped = await getGroupedErrors();
    const totalCount = await prisma.systemLog.count({
      where: { level: { in: ["ERROR", "FATAL"] } },
    });

    return NextResponse.json({
      success: true,
      totalErrors: totalCount,
      uniqueErrors: grouped.length,
      errors: grouped,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load errors" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await req.json();
    const { action, service, message, level = "ERROR" } = body;

    if (action === "clear_errors") {
      // Clear resolved errors
      await prisma.systemLog.deleteMany({
        where: { level: { in: ["ERROR", "FATAL"] } },
      });
      return NextResponse.json({ success: true, message: "Error log cleared." });
    }

    if (action === "report_error") {
      // Sanitize message: never store secrets/tokens
      const sanitized = String(message || "Runtime exception").replace(
        /(bearer\s+[a-zA-Z0-9_\-\.]+)|(key=[a-zA-Z0-9_\-]+)|(token=[a-zA-Z0-9_\-]+)/gi,
        "[REDACTED]"
      );

      await prisma.systemLog.create({
        data: {
          level,
          service: service || "API",
          message: sanitized,
        },
      });

      return NextResponse.json({ success: true, message: "Error recorded." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Action failed" },
      { status: 500 }
    );
  }
}
