/**
 * lib/security/rbac.ts
 *
 * CHILLER — Server-side Role-Based Access Control (RBAC)
 *
 * SECURITY POLICY:
 * - All authorization is performed SERVER-SIDE only. Never trust client-provided roles.
 * - SUPER_ADMIN access is determined exclusively by exact normalized email identity matching
 *   against SUPER_ADMIN_EMAILS env var. Database role field is always re-verified.
 * - Normal ADMINs may NEVER promote or create SUPER_ADMIN accounts.
 * - All sensitive SUPER_ADMIN actions are audit-logged.
 * - Do NOT use: contains(), startsWith(), endsWith() for email authorization.
 * - ONLY exact strict lowercase email comparison is permitted.
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  isSuperAdminEmail,
  getSuperAdminEmailSet,
  DESIGNATED_SUPER_ADMIN_EMAILS,
  normalizeAdminEmail,
} from "@/lib/config/super-admin";

export {
  isSuperAdminEmail,
  getSuperAdminEmailSet,
  DESIGNATED_SUPER_ADMIN_EMAILS,
  normalizeAdminEmail,
};

// ============================================================================
// Session-based guards
// These fetch the session and re-verify identity from the database.
// ============================================================================

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
}

/**
 * Resolves the current session into an AuthContext.
 * Re-fetches the user from DB to ensure role is not stale from JWT.
 * Returns null if unauthenticated.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const email = (session.user.email as string).trim().toLowerCase();

  // Re-fetch from DB to get current role (JWT may be stale)
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    isSuperAdmin: isSuperAdminEmail(user.email),
  };
}

/**
 * Requires the current request to be authenticated as a SUPER_ADMIN.
 * Returns AuthContext on success, or NextResponse 401/403 on failure.
 *
 * Usage in API routes:
 *   const authResult = await requireSuperAdmin();
 *   if (authResult instanceof NextResponse) return authResult;
 *   const { userId, email } = authResult;
 */
export async function requireSuperAdmin(): Promise<AuthContext | NextResponse> {
  const ctx = await getAuthContext();

  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ctx.isSuperAdmin) {
    // Audit the failed attempt
    await writeAuditLog({
      adminEmail: ctx.email,
      action: "SUPER_ADMIN_ACCESS_DENIED",
      target: "SUPER_ADMIN_ENDPOINT",
      details: { role: ctx.role, reason: "Email not in SUPER_ADMIN_EMAILS" },
      ipAddress: null,
    }).catch(() => {/* non-blocking */});

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return ctx;
}

/**
 * Requires the current request to be authenticated as at minimum ADMIN.
 * SUPER_ADMIN also satisfies this check.
 */
export async function requireAdmin(): Promise<AuthContext | NextResponse> {
  const ctx = await getAuthContext();

  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminRoles = new Set(["ADMIN", "SUPER_ADMIN"]);
  if (!adminRoles.has(ctx.role) && !ctx.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return ctx;
}

// ============================================================================
// Audit Logging
// ============================================================================

interface AuditLogEntry {
  adminEmail: string;
  action: string;
  target?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * Writes a structured audit log entry.
 * Non-blocking when called without await (fire-and-forget pattern).
 * Always use await for critical security events.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminEmail: entry.adminEmail,
        action: entry.action,
        target: entry.target ?? null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit failures should never crash the main request
    console.error("[AUDIT_LOG_ERROR]", err);
  }
}

/**
 * Extracts real IP from standard Next.js/proxy headers.
 */
export function getClientIp(request: Request): string | null {
  const headers = request instanceof Request ? request.headers : null;
  if (!headers) return null;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null
  );
}

// ============================================================================
// Role promotion guard
// Prevents normal ADMIN from setting SUPER_ADMIN role.
// ============================================================================

/**
 * Validates a proposed role change.
 * Normal ADMINs may never set or promote to SUPER_ADMIN.
 * Only SUPER_ADMIN themselves may set SUPER_ADMIN role on another account.
 */
export function canSetRole(
  actorCtx: AuthContext,
  targetRole: string
): { allowed: boolean; reason?: string } {
  const normalized = targetRole.trim().toUpperCase();
  if (normalized === "SUPER_ADMIN") {
    if (!actorCtx.isSuperAdmin) {
      return {
        allowed: false,
        reason: "Only a SUPER_ADMIN may grant SUPER_ADMIN role.",
      };
    }
  }
  const validRoles = new Set(["USER", "ADMIN", "MODERATOR", "SUPER_ADMIN"]);
  if (!validRoles.has(normalized)) {
    return { allowed: false, reason: `Invalid role: ${targetRole}` };
  }
  return { allowed: true };
}

/**
 * Root account and role escalation guard.
 * Prevents demotion, deletion, or tampering with the two designated owner identities.
 */
export function canModifyUser(
  actorCtx: AuthContext,
  targetEmail: string,
  proposedRole?: string
): { allowed: boolean; reason?: string } {
  const normalizedTarget = normalizeAdminEmail(targetEmail);
  const isTargetDesignatedOwner = DESIGNATED_SUPER_ADMIN_EMAILS.map((e) =>
    e.toLowerCase()
  ).includes(normalizedTarget);

  if (
    isTargetDesignatedOwner &&
    proposedRole &&
    proposedRole.trim().toUpperCase() !== "SUPER_ADMIN"
  ) {
    return {
      allowed: false,
      reason: "Root owner Super Admin accounts cannot be demoted.",
    };
  }

  if (isTargetDesignatedOwner && !actorCtx.isSuperAdmin) {
    return {
      allowed: false,
      reason: "Non-super-admins cannot modify root owner accounts.",
    };
  }

  return { allowed: true };
}
