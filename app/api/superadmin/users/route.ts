/**
 * app/api/superadmin/users/route.ts
 *
 * SUPER_ADMIN-only user management API.
 * Actions here require SUPER_ADMIN identity (not just ADMIN role).
 *
 * Security: requireSuperAdmin() re-validates identity from DB.
 * All actions are audit-logged.
 */

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  writeAuditLog,
  getClientIp,
  isSuperAdminEmail,
} from "@/lib/security/rbac";

export const dynamic = "force-dynamic";

// POST /api/superadmin/users — perform sensitive user actions
export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const actorCtx = authResult;

  const ip = getClientIp(request);
  const body = await request.json();
  const { action, userId, email, newPassword } = body;

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  switch (action) {
    // Force password reset on next login
    case "FORCE_PASSWORD_RESET": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      await prisma.user.update({
        where: { id: userId },
        data: { mustChangePassword: true },
      });

      await writeAuditLog({
        adminEmail: actorCtx.email,
        action: "FORCE_PASSWORD_RESET",
        target: user.email,
        details: { triggeredBy: actorCtx.email },
        ipAddress: ip,
      });

      return NextResponse.json({ success: true, message: `Password reset forced for ${user.email}` });
    }

    // Manually set a user's password (SUPER_ADMIN only)
    case "SET_PASSWORD": {
      if (!userId || !newPassword) {
        return NextResponse.json({ error: "userId and newPassword required" }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const passwordHash = await hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: false },
      });

      await writeAuditLog({
        adminEmail: actorCtx.email,
        action: "SET_USER_PASSWORD",
        target: user.email,
        details: { setBy: actorCtx.email },
        ipAddress: ip,
      });

      return NextResponse.json({ success: true });
    }

    // Promote a user to SUPER_ADMIN
    // This is normally blocked from the regular admin API.
    // Requires SUPER_ADMIN identity AND the target email must already be in SUPER_ADMIN_EMAILS.
    case "PROMOTE_TO_SUPER_ADMIN": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
      });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      // Enforce: the target email must be in SUPER_ADMIN_EMAILS env var
      if (!isSuperAdminEmail(user.email)) {
        await writeAuditLog({
          adminEmail: actorCtx.email,
          action: "SUPER_ADMIN_PROMOTION_BLOCKED",
          target: user.email,
          details: { reason: "Target email is not in SUPER_ADMIN_EMAILS" },
          ipAddress: ip,
        });
        return NextResponse.json(
          { error: "This email is not authorized for SUPER_ADMIN role." },
          { status: 403 }
        );
      }

      await prisma.user.update({
        where: { id: userId },
        data: { role: "SUPER_ADMIN" },
      });

      await writeAuditLog({
        adminEmail: actorCtx.email,
        action: "PROMOTE_TO_SUPER_ADMIN",
        target: user.email,
        details: { promotedBy: actorCtx.email, previousRole: user.role },
        ipAddress: ip,
      });

      return NextResponse.json({ success: true, message: `${user.email} promoted to SUPER_ADMIN.` });
    }

    // Demote a SUPER_ADMIN back to ADMIN (for SUPER_ADMIN managing their own list)
    case "DEMOTE_FROM_SUPER_ADMIN": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
      });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      // Prevent self-demotion
      if (user.email === actorCtx.email) {
        return NextResponse.json({ error: "You cannot demote yourself." }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { role: "ADMIN" },
      });

      await writeAuditLog({
        adminEmail: actorCtx.email,
        action: "DEMOTE_FROM_SUPER_ADMIN",
        target: user.email,
        details: { demotedBy: actorCtx.email },
        ipAddress: ip,
      });

      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
