/**
 * lib/config/super-admin.ts
 *
 * CHILLER — Super Admin & Root Control Configuration Layer
 *
 * SECURITY POLICY:
 * - Reads existing server-side environment variables (SUPER_ADMIN_EMAILS, SUPER_ADMIN_BOOTSTRAP_PASSWORD, SUPER_ADMIN_PASSWORD).
 * - NEVER exposes the password to the client, logs, or API responses.
 * - Enforces exact normalized email matching for the two designated owner identities:
 *   1. roytejaswi40@gmail.com
 *   2. roytejaswi206@gmail.com
 * - Provides safe bootstrap and synchronization methods for server startup and authentication.
 */

import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

// The canonical designated owner identities for CHILLER
export const DESIGNATED_SUPER_ADMIN_EMAILS = Object.freeze([
  "roytejaswi40@gmail.com",
  "roytejaswi206@gmail.com",
]);

/**
 * Normalizes email by trimming, converting to lowercase, and stripping any surrounding quotes.
 */
export function normalizeAdminEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email
    .trim()
    .toLowerCase()
    .replace(/^["']|["']$/g, "");
}

/**
 * Returns the normalized set of authorized SUPER_ADMIN email identities.
 * Combines designated identities with any from SUPER_ADMIN_EMAILS or SUPER_ADMIN_EMAIL_* env vars.
 */
export function getSuperAdminEmailSet(): ReadonlySet<string> {
  const emailSet = new Set<string>();

  // Always include canonical designated owner identities
  for (const email of DESIGNATED_SUPER_ADMIN_EMAILS) {
    emailSet.add(normalizeAdminEmail(email));
  }

  // Read environment variable if present
  const rawEmails = process.env.SUPER_ADMIN_EMAILS ?? "";
  if (rawEmails) {
    const split = rawEmails.split(",");
    for (const item of split) {
      const cleaned = normalizeAdminEmail(item);
      if (cleaned && cleaned.includes("@")) {
        emailSet.add(cleaned);
      }
    }
  }

  // Also support individual env variables if set
  const email1 = process.env.SUPER_ADMIN_EMAIL_1;
  if (email1) {
    const cleaned = normalizeAdminEmail(email1);
    if (cleaned && cleaned.includes("@")) emailSet.add(cleaned);
  }

  const email2 = process.env.SUPER_ADMIN_EMAIL_2;
  if (email2) {
    const cleaned = normalizeAdminEmail(email2);
    if (cleaned && cleaned.includes("@")) emailSet.add(cleaned);
  }

  return emailSet;
}

/**
 * Checks if a given email is an authorized SUPER_ADMIN identity.
 * Strict exact match on normalized lowercase string — no wildcards, no substrings.
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeAdminEmail(email);
  return getSuperAdminEmailSet().has(normalized);
}

/**
 * Returns whether a Super Admin password has been configured in the environment.
 * NEVER returns the password itself.
 */
export function isSuperAdminPasswordConfigured(): boolean {
  const pw =
    process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD ||
    process.env.SUPER_ADMIN_PASSWORD ||
    "";
  return pw.trim().length > 0;
}

/**
 * Internal server-side only retrieval of the raw configured password.
 * MUST NEVER be returned to the client, logged, or serialized into JSON.
 */
export function getInternalSuperAdminPassword(): string | null {
  const pw =
    process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD ||
    process.env.SUPER_ADMIN_PASSWORD ||
    "";
  const trimmed = pw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Safe public diagnostic metadata about Super Admin status.
 * Never includes passwords or hashes.
 */
export function getSuperAdminDiagnostics() {
  const emails = Array.from(getSuperAdminEmailSet());
  return {
    configuredIdentitiesCount: emails.length,
    superAdminEmails: emails,
    isPasswordConfigured: isSuperAdminPasswordConfigured(),
    credentialStatus: isSuperAdminPasswordConfigured()
      ? "SUPER ADMIN CREDENTIAL CONFIGURED"
      : "CREDENTIAL_MISSING",
  };
}

/**
 * Bootstraps or synchronizes the designated Super Admin accounts in the database.
 * If the user exists:
 *   - Verifies role is SUPER_ADMIN
 *   - Updates passwordHash if it does not match configured env password
 * If user does not exist:
 *   - Creates new user with role SUPER_ADMIN and hashed password
 */
export async function bootstrapSuperAdminAccounts(): Promise<{
  success: boolean;
  syncedEmails: string[];
  errors: string[];
}> {
  const emails = Array.from(getSuperAdminEmailSet());
  const envPassword = getInternalSuperAdminPassword();
  const errors: string[] = [];
  const syncedEmails: string[] = [];

  if (!envPassword) {
    errors.push("No Super Admin password found in environment variables.");
    return { success: false, syncedEmails, errors };
  }

  const newHash = await hash(envPassword, 12);

  for (const email of emails) {
    try {
      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        let needsPasswordUpdate = false;
        if (!existing.passwordHash) {
          needsPasswordUpdate = true;
        } else {
          // Check if current password hash matches configured env password
          const matches = await compare(envPassword, existing.passwordHash);
          if (!matches) {
            needsPasswordUpdate = true;
          }
        }

        await prisma.user.update({
          where: { email },
          data: {
            role: "SUPER_ADMIN",
            mustChangePassword: false, // Ensure direct access without forced redirect loop
            name: existing.name || "Tejaswi Roy (Super Admin)",
            ...(needsPasswordUpdate ? { passwordHash: newHash } : {}),
          },
        });

        syncedEmails.push(email);
      } else {
        await prisma.user.create({
          data: {
            email,
            name: "Tejaswi Roy (Super Admin)",
            passwordHash: newHash,
            role: "SUPER_ADMIN",
            tier: "PREMIUM_YEARLY",
            mustChangePassword: false,
          },
        });

        syncedEmails.push(email);
      }
    } catch (err: any) {
      errors.push(`Failed to sync ${email}: ${err?.message || String(err)}`);
    }
  }

  // Record audit event
  try {
    await prisma.auditLog.create({
      data: {
        adminEmail: "system:bootstrap",
        action: "SUPER_ADMIN_BOOTSTRAP_SYNC",
        target: "SUPER_ADMIN_ACCOUNTS",
        details: JSON.stringify({
          syncedCount: syncedEmails.length,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  } catch {
    // Non-blocking
  }

  return {
    success: errors.length === 0,
    syncedEmails,
    errors,
  };
}
