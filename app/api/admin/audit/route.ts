import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    const actionFilter = searchParams.get("action");
    const adminFilter = searchParams.get("admin");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: any = {};
    if (actionFilter && actionFilter !== "ALL") {
      where.action = actionFilter;
    }
    if (adminFilter && adminFilter.trim()) {
      where.adminEmail = { contains: adminFilter.trim().toLowerCase() };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Unique action types for dropdown
    const distinctActions = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
    });

    return NextResponse.json({
      success: true,
      total,
      actions: distinctActions.map((a) => a.action),
      logs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load audit logs" },
      { status: 500 }
    );
  }
}
