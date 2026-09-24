/**
 * app/api/admin/users/route.ts
 *
 * User management API — accessible to ADMIN and SUPER_ADMIN.
 * Role promotion to SUPER_ADMIN requires SUPER_ADMIN identity.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
  requireSuperAdmin,
  canSetRole,
  canModifyUser,
  writeAuditLog,
  getClientIp,
} from "@/lib/security/rbac";

export const dynamic = "force-dynamic";

// GET /api/admin/users — list users (ADMIN+)
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50"));

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
        mustChangePassword: true,
        createdAt: true,
        _count: {
          select: { watchlist: true, watchHistory: true },
        },
      },
    }),
    prisma.user.count(),
  ]);

  return NextResponse.json({ users, total, page, limit });
}

// PATCH /api/admin/users — update user role or tier (ADMIN for tier, SUPER_ADMIN for role promotion)
export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const actorCtx = authResult;

  const ip = getClientIp(request);
  const body = await request.json();
  const { userId, role, tier } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, tier: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updates: Record<string, string | boolean> = {};

  // Role update — requires SUPER_ADMIN to set SUPER_ADMIN role
  if (role !== undefined) {
    const modCheck = canModifyUser(actorCtx, targetUser.email, role);
    if (!modCheck.allowed) {
      await writeAuditLog({
        adminEmail: actorCtx.email,
        action: "ROOT_ACCOUNT_MODIFICATION_BLOCKED",
        target: targetUser.email,
        details: { attemptedRole: role, reason: modCheck.reason },
        ipAddress: ip,
      });
      return NextResponse.json({ error: modCheck.reason }, { status: 403 });
    }

    // Require SUPER_ADMIN for any role change to SUPER_ADMIN
    const { allowed, reason } = canSetRole(actorCtx, role);
    if (!allowed) {
      await writeAuditLog({
        adminEmail: actorCtx.email,
        action: "ROLE_PROMOTION_DENIED",
        target: targetUser.email,
        details: { attemptedRole: role, reason },
        ipAddress: ip,
      });
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // For SUPER_ADMIN role promotion, additionally verify the actor IS a SUPER_ADMIN
    if (role.trim().toUpperCase() === "SUPER_ADMIN") {
      const saResult = await requireSuperAdmin();
      if (saResult instanceof NextResponse) return saResult;
    }

    updates.role = role.trim().toUpperCase();
  }

  // Tier update — any ADMIN can change tiers
  if (tier !== undefined) {
    const validTiers = new Set(["FREE", "PREMIUM_MONTHLY", "PREMIUM_YEARLY"]);
    if (!validTiers.has(tier.trim().toUpperCase())) {
      return NextResponse.json({ error: `Invalid tier: ${tier}` }, { status: 400 });
    }
    updates.tier = tier.trim().toUpperCase();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: { id: true, email: true, role: true, tier: true },
  });

  await writeAuditLog({
    adminEmail: actorCtx.email,
    action: "USER_UPDATED",
    target: targetUser.email,
    details: { before: { role: targetUser.role, tier: targetUser.tier }, after: updates },
    ipAddress: ip,
  });

  return NextResponse.json({ success: true, user: updated });
}

// DELETE /api/admin/users — delete user (SUPER_ADMIN only, root protected)
export async function DELETE(request: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const actorCtx = authResult;

  const ip = getClientIp(request);
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Block deletion of root owner identities
  const modCheck = canModifyUser(actorCtx, targetUser.email);
  if (!modCheck.allowed || targetUser.role === "SUPER_ADMIN") {
    await writeAuditLog({
      adminEmail: actorCtx.email,
      action: "SUPER_ADMIN_DELETION_BLOCKED",
      target: targetUser.email,
      details: { reason: "Cannot delete a SUPER_ADMIN account" },
      ipAddress: ip,
    });
    return NextResponse.json(
      { error: "Root SUPER_ADMIN accounts cannot be deleted." },
      { status: 403 }
    );
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  await writeAuditLog({
    adminEmail: actorCtx.email,
    action: "USER_DELETED",
    target: targetUser.email,
    details: { deletedUserId: userId },
    ipAddress: ip,
  });

  return NextResponse.json({ success: true, message: `User ${targetUser.email} deleted` });
}
