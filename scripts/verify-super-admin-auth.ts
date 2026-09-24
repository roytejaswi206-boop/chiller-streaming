/**
 * scripts/verify-super-admin-auth.ts
 *
 * Automated Test Suite for CHILLER Super Admin & Root Control Authority
 *
 * CRITICAL RULE: NEVER print or output the password!
 * Only verify boolean matches internally.
 */

import { compare } from "bcryptjs";
import { prisma } from "../lib/prisma";
import {
  isSuperAdminEmail,
  getSuperAdminEmailSet,
  DESIGNATED_SUPER_ADMIN_EMAILS,
  normalizeAdminEmail,
  getSuperAdminDiagnostics,
  isSuperAdminPasswordConfigured,
  getInternalSuperAdminPassword,
} from "../lib/config/super-admin";
import { canSetRole, canModifyUser, writeAuditLog } from "../lib/security/rbac";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    results.push({ name: testName, passed: true });
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    results.push({ name: testName, passed: false, error: errorDetail || "Assertion failed" });
    console.error(`  ✗ [FAIL] ${testName}: ${errorDetail || "Assertion failed"}`);
  }
}

async function runSuperAdminVerification() {
  console.log("\n=======================================================");
  console.log("🛡️  CHILLER SUPER ADMIN & ROOT CONTROL TEST SUITE");
  console.log("=======================================================\n");

  // ── 1. Designated Identities Configuration ──────────────────
  console.log("Section 1: Designated Identities Configuration");
  const emailSet = getSuperAdminEmailSet();
  assert(emailSet.size >= 2, "At least 2 Super Admin email identities configured");
  assert(
    emailSet.has("roytejaswi40@gmail.com"),
    "Super Admin #1 (roytejaswi40@gmail.com) present in registry"
  );
  assert(
    emailSet.has("roytejaswi206@gmail.com"),
    "Super Admin #2 (roytejaswi206@gmail.com) present in registry"
  );
  assert(
    DESIGNATED_SUPER_ADMIN_EMAILS.includes("roytejaswi40@gmail.com"),
    "roytejaswi40@gmail.com is in canonical DESIGNATED_SUPER_ADMIN_EMAILS"
  );
  assert(
    DESIGNATED_SUPER_ADMIN_EMAILS.includes("roytejaswi206@gmail.com"),
    "roytejaswi206@gmail.com is in canonical DESIGNATED_SUPER_ADMIN_EMAILS"
  );

  // ── 2. Email Normalization & Strict Matching ────────────────
  console.log("\nSection 2: Email Normalization & Strict Matching");
  assert(
    isSuperAdminEmail("  ROYTEJASWI40@GMAIL.COM  "),
    "Case-insensitive & whitespace trimmed match for Admin #1"
  );
  assert(
    isSuperAdminEmail("  RoyTejaswi206@Gmail.com  "),
    "Case-insensitive & whitespace trimmed match for Admin #2"
  );
  assert(
    !isSuperAdminEmail("attacker@gmail.com"),
    "Negative: arbitrary gmail address denied"
  );
  assert(
    !isSuperAdminEmail("user@velora.com"),
    "Negative: standard user address denied"
  );
  assert(
    !isSuperAdminEmail("admin@chiller.app"),
    "Negative: non-designated admin email denied SUPER_ADMIN"
  );
  assert(
    !isSuperAdminEmail("roytejaswi40@gmail.com.attacker.com"),
    "Negative: prefix injection domain spoofing denied"
  );
  assert(
    !isSuperAdminEmail("fake_roytejaswi40@gmail.com"),
    "Negative: substring matching denied"
  );

  // ── 3. Credential Protection & Diagnostics ──────────────────
  console.log("\nSection 3: Credential Protection & Diagnostics");
  assert(
    isSuperAdminPasswordConfigured(),
    "Super Admin password credential is configured in environment"
  );
  const internalPassword = getInternalSuperAdminPassword();
  assert(
    Boolean(internalPassword && internalPassword.length >= 8),
    "Server-side password resolution is active (credential not printed)"
  );

  const diagnostics = getSuperAdminDiagnostics();
  assert(
    diagnostics.credentialStatus === "SUPER ADMIN CREDENTIAL CONFIGURED",
    "Diagnostics reports 'SUPER ADMIN CREDENTIAL CONFIGURED'"
  );
  assert(
    diagnostics.configuredIdentitiesCount >= 2,
    "Diagnostics reports >= 2 configured identities"
  );
  const diagString = JSON.stringify(diagnostics);
  assert(
    !diagString.includes(internalPassword || "NEVER_MATCH"),
    "Zero Secret Exposure: raw password is NOT present in diagnostics JSON"
  );

  // ── 4. Database User Records & Password Verification ────────
  console.log("\nSection 4: Database User Records & Cryptographic Verification");
  const u1 = await prisma.user.findUnique({
    where: { email: "roytejaswi40@gmail.com" },
  });
  assert(Boolean(u1), "Super Admin #1 exists in database");
  assert(u1?.role === "SUPER_ADMIN", "Super Admin #1 has role SUPER_ADMIN in DB");
  assert(
    u1?.mustChangePassword === false,
    "Super Admin #1 mustChangePassword is false (no lockout loop)"
  );
  const u1PassValid = u1?.passwordHash && internalPassword
    ? await compare(internalPassword, u1.passwordHash)
    : false;
  assert(u1PassValid, "Super Admin #1 password hash verified against env credential");

  const u2 = await prisma.user.findUnique({
    where: { email: "roytejaswi206@gmail.com" },
  });
  assert(Boolean(u2), "Super Admin #2 exists in database");
  assert(u2?.role === "SUPER_ADMIN", "Super Admin #2 has role SUPER_ADMIN in DB");
  assert(
    u2?.mustChangePassword === false,
    "Super Admin #2 mustChangePassword is false (no lockout loop)"
  );
  const u2PassValid = u2?.passwordHash && internalPassword
    ? await compare(internalPassword, u2.passwordHash)
    : false;
  assert(u2PassValid, "Super Admin #2 password hash verified against env credential");

  // ── 5. Role Escalation & Root Account Protection Guards ──────
  console.log("\nSection 5: Role Escalation & Root Account Protection Guards");
  const mockAdminContext = {
    userId: "admin-1",
    email: "admin@chiller.app",
    role: "ADMIN",
    isSuperAdmin: false,
  };
  const mockSuperAdminContext = {
    userId: "super-1",
    email: "roytejaswi40@gmail.com",
    role: "SUPER_ADMIN",
    isSuperAdmin: true,
  };

  // Normal admin cannot promote to SUPER_ADMIN
  const escalationAttempt = canSetRole(mockAdminContext, "SUPER_ADMIN");
  assert(!escalationAttempt.allowed, "canSetRole blocks non-super-admin from granting SUPER_ADMIN");

  // SUPER_ADMIN can grant SUPER_ADMIN
  const saPromotion = canSetRole(mockSuperAdminContext, "SUPER_ADMIN");
  assert(saPromotion.allowed, "canSetRole allows SUPER_ADMIN to grant SUPER_ADMIN");

  // Root account protection
  const demoteAttempt = canModifyUser(mockSuperAdminContext, "roytejaswi40@gmail.com", "USER");
  assert(!demoteAttempt.allowed, "canModifyUser blocks demoting root owner to USER");

  const demoteAttempt2 = canModifyUser(mockSuperAdminContext, "roytejaswi206@gmail.com", "ADMIN");
  assert(!demoteAttempt2.allowed, "canModifyUser blocks demoting root owner to ADMIN");

  const nonSaTamper = canModifyUser(mockAdminContext, "roytejaswi40@gmail.com");
  assert(!nonSaTamper.allowed, "canModifyUser blocks non-super-admin from modifying root owner");

  // ── 6. Audit Logging Verification ───────────────────────────
  console.log("\nSection 6: Audit Logging Verification");
  await writeAuditLog({
    adminEmail: "roytejaswi40@gmail.com",
    action: "VERIFICATION_TEST_EVENT",
    target: "SECURITY_TEST_SUITE",
    details: { test: true, timestamp: new Date().toISOString() },
  });

  const loggedEvent = await prisma.auditLog.findFirst({
    where: { action: "VERIFICATION_TEST_EVENT" },
    orderBy: { createdAt: "desc" },
  });
  assert(Boolean(loggedEvent), "Audit log entry successfully created and retrieved");
  assert(
    loggedEvent?.adminEmail === "roytejaswi40@gmail.com",
    "Audit log recorded correct actor email"
  );

  // ── Summary ─────────────────────────────────────────────────
  console.log("\n=======================================================");
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`TEST RESULTS: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("=======================================================\n");

  if (passed === total) {
    console.log("✅ ALL SUPER ADMIN AUTHORIZATION TESTS PASSED!\n");
  } else {
    console.error("❌ SOME TESTS FAILED!\n");
    process.exit(1);
  }
}

runSuperAdminVerification()
  .catch((err) => {
    console.error("Verification script failed with exception:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
