/**
 * app/api/admin/security/route.ts
 *
 * Super Admin Security Center API
 *
 * Exposes:
 * - Super admin identities status (never exposing password or hashes)
 * - Security audit events & alerts
 * - Safe bootstrap trigger
 *
 * Access: SUPER_ADMIN only
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  writeAuditLog,
  getClientIp,
} from "@/lib/security/rbac";
import {
  getSuperAdminDiagnostics,
  bootstrapSuperAdminAccounts,
} from "@/lib/config/super-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const diagnostics = getSuperAdminDiagnostics();

  // Fetch registered Super Admin accounts from database
  const superAdminUsers = await prisma.user.findMany({
    where: {
      role: "SUPER_ADMIN",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tier: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Recent security audit events
  const securityLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          "SUPER_ADMIN_LOGIN",
          "SUPER_ADMIN_ACCESS_DENIED",
          "ROLE_PROMOTION_DENIED",
          "ROOT_ACCOUNT_MODIFICATION_BLOCKED",
          "SUPER_ADMIN_DELETION_BLOCKED",
          "SUPER_ADMIN_BOOTSTRAP_SYNC",
          "USER_UPDATED",
          "USER_DELETED",
        ],
      },
    },
    take: 30,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    diagnostics,
    superAdminUsers,
    securityLogs,
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const actorCtx = authResult;

  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const { action } = body;

  if (action === "SYNC_SUPER_ADMINS") {
    const result = await bootstrapSuperAdminAccounts();

    await writeAuditLog({
      adminEmail: actorCtx.email,
      action: "SUPER_ADMIN_MANUAL_SYNC",
      target: "SUPER_ADMIN_ACCOUNTS",
      details: { success: result.success, synced: result.syncedEmails },
      ipAddress: ip,
    });

    return NextResponse.json({
      success: result.success,
      syncedEmails: result.syncedEmails,
      errors: result.errors,
      credentialStatus: "SUPER ADMIN CREDENTIAL CONFIGURED",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
