#!/usr/bin/env tsx
/**
 * scripts/seed-admin.ts
 *
 * CHILLER — SUPER_ADMIN Bootstrap Seeder
 *
 * SECURITY:
 * - Requires SUPER_ADMIN_BOOTSTRAP_PASSWORD env var (min 12 chars).
 * - Requires SUPER_ADMIN_EMAILS env var with comma-separated authorized emails.
 * - DO NOT commit this to Git with a real password. Keep SUPER_ADMIN_BOOTSTRAP_PASSWORD in .env.local only.
 * - The bootstrap password is single-use: set mustChangePassword = true so the admin
 *   is forced to set their own password on first login.
 * - Idempotent: safe to run multiple times. Will upsert, not duplicate.
 *
 * Usage:
 *   npm run seed:admin
 *   or
 *   npx tsx scripts/seed-admin.ts
 */

import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================================
// Configuration
// ============================================================================

const SUPER_ADMIN_DISPLAY_NAME = "Tejaswi Roy";

function getSuperAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));

  if (emails.length === 0) {
    throw new Error(
      "[seed:admin] SUPER_ADMIN_EMAILS is not set or empty.\n" +
        "Set it in .env.local as: SUPER_ADMIN_EMAILS=roytejaswi40@gmail.com,roytejaswi206@gmail.com"
    );
  }
  return emails;
}

function getBootstrapPassword(): string {
  const pw = process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD ?? "";
  if (!pw) {
    throw new Error(
      "[seed:admin] SUPER_ADMIN_BOOTSTRAP_PASSWORD is not set.\n" +
        "Set it in .env.local (DO NOT COMMIT): SUPER_ADMIN_BOOTSTRAP_PASSWORD=<strong-password>"
    );
  }
  if (pw.length < 12) {
    throw new Error(
      "[seed:admin] SUPER_ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters."
    );
  }
  return pw;
}

// ============================================================================
// Seed
// ============================================================================

async function main() {
  console.log("\n🔐 CHILLER SUPER_ADMIN Bootstrap Seeder");
  console.log("=".repeat(50));

  const superAdminEmails = getSuperAdminEmails();
  const bootstrapPassword = getBootstrapPassword();

  console.log(`\n📋 Authorized SUPER_ADMIN emails: ${superAdminEmails.length}`);
  superAdminEmails.forEach((e) => console.log(`   • ${e}`));

  const passwordHash = await hash(bootstrapPassword, 12);

  for (const email of superAdminEmails) {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Update role to SUPER_ADMIN and set mustChangePassword
      await prisma.user.update({
        where: { email },
        data: {
          role: "SUPER_ADMIN",
          mustChangePassword: true,
          name: existing.name || SUPER_ADMIN_DISPLAY_NAME,
          // Only update password if the account currently has no password
          // or if the --reset-password flag is passed
          ...(process.argv.includes("--reset-password") || !existing.passwordHash
            ? { passwordHash }
            : {}),
        },
      });
      console.log(`\n✅ UPDATED existing account: ${email}`);
      console.log(`   Role → SUPER_ADMIN`);
      console.log(`   mustChangePassword → true`);
      if (process.argv.includes("--reset-password") || !existing.passwordHash) {
        console.log(`   Password → reset to bootstrap password (MUST CHANGE)`);
      } else {
        console.log(`   Password → UNCHANGED (use --reset-password to force reset)`);
      }
    } else {
      // Create new SUPER_ADMIN account
      await prisma.user.create({
        data: {
          email,
          name: SUPER_ADMIN_DISPLAY_NAME,
          passwordHash,
          role: "SUPER_ADMIN",
          tier: "FREE",
          mustChangePassword: true, // Force password change on first login
        },
      });
      console.log(`\n✅ CREATED new SUPER_ADMIN account: ${email}`);
      console.log(`   Name: ${SUPER_ADMIN_DISPLAY_NAME}`);
      console.log(`   mustChangePassword → true (MUST CHANGE PASSWORD AFTER LOGIN)`);
    }
  }

  // Audit the bootstrap action in system logs
  try {
    await prisma.systemLog.create({
      data: {
        level: "INFO",
        service: "AUTH",
        message: "SUPER_ADMIN bootstrap seeder executed",
        metadata: JSON.stringify({
          seededEmails: superAdminEmails,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  } catch {
    // Non-blocking — log table may not exist in older migrations
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Bootstrap complete.");
  console.log("\n⚠️  SECURITY REMINDERS:");
  console.log("   1. Log in and change your password immediately.");
  console.log("   2. Remove SUPER_ADMIN_BOOTSTRAP_PASSWORD from .env.local after seeding.");
  console.log("   3. DO NOT commit bootstrap credentials to Git.\n");
}

main()
  .catch((err) => {
    console.error("\n❌ Seeder failed:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
