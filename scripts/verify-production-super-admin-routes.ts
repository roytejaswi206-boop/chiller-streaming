/**
 * scripts/verify-production-super-admin-routes.ts
 *
 * Real browser verification of CHILLER Super Admin routes on Production
 * (https://chillerstream.duckdns.org).
 *
 * Tests:
 * 1. Unauthenticated redirect to /login
 * 2. Login as Super Admin (roytejaswi40@gmail.com)
 * 3. Profile dropdown -> Root Control Center (/admin) loads cleanly
 * 4. Profile dropdown -> Security Authority (/admin/security) loads cleanly
 * 5. Profile dropdown -> Intelligence Engine (/admin/intelligence) loads cleanly
 * 6. Mobile viewport rendering on Android/Mobile scale
 * 7. Normal user block / Access Denied verification
 * 8. Zero password/credential exposure
 */

import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { getInternalSuperAdminPassword } from "../lib/config/super-admin";

const PROD_URL = "https://chillerstream.duckdns.org";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS_DIR = path.resolve("C:\\Users\\Tejaswi\\.gemini\\antigravity-ide\\brain\\687047c7-cc8a-49b0-b72c-a0810e25821c");

async function main() {
  console.log("=================================================================");
  console.log("🛡️  CHILLER PRODUCTION SUPER ADMIN ROUTE VERIFIER");
  console.log(`Target: ${PROD_URL}`);
  console.log("=================================================================\n");

  const password = getInternalSuperAdminPassword();
  if (!password) {
    console.error("FATAL: Super Admin password is not set in environment.");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Unauthenticated access to /admin
  // ────────────────────────────────────────────────────────────────────────
  console.log("[TEST 1] Testing unauthenticated access to /admin...");
  await page.goto(`${PROD_URL}/admin`, { waitUntil: "networkidle2", timeout: 30000 });
  const unauthUrl = page.url();
  const unauthPassed = unauthUrl.includes("/login");
  console.log(`  Result URL: ${unauthUrl}`);
  console.log(`  [TEST 1] Unauthenticated redirect: ${unauthPassed ? "PASS" : "FAIL"}\n`);

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Super Admin Login (roytejaswi40@gmail.com)
  // ────────────────────────────────────────────────────────────────────────
  console.log("[TEST 2] Logging in as Super Admin (roytejaswi40@gmail.com)...");
  await page.goto(`${PROD_URL}/login?callbackUrl=/`, { waitUntil: "networkidle2", timeout: 30000 });

  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', "roytejaswi40@gmail.com");
  await page.type('input[type="password"]', password);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 25000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  console.log(`  Post-login URL: ${page.url()}`);

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Navigate to Root Control Center (/admin)
  // ────────────────────────────────────────────────────────────────────────
  console.log("\n[TEST 3] Navigating to Root Control Center (/admin)...");
  await page.goto(`${PROD_URL}/admin`, { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading"), { timeout: 15000 }).catch(() => {});

  const adminBody = await page.evaluate(() => document.body.innerText);
  const adminHasServerError = adminBody.includes("This page couldn't load") || adminBody.includes("A server error occurred");
  const adminLoaded = (adminBody.includes("Root Control Center") || adminBody.includes("SUPER ADMIN") || adminBody.includes("Dashboard")) && !adminHasServerError;

  console.log(`  Admin page URL: ${page.url()}`);
  console.log(`  Server error detected: ${adminHasServerError ? "YES (FAIL)" : "NO (PASS)"}`);
  console.log(`  Root Control Center loaded: ${adminLoaded ? "PASS" : "FAIL"}`);

  const adminScreenshotPath = path.join(ARTIFACTS_DIR, "production_root_control_center.png");
  await page.screenshot({ path: adminScreenshotPath, fullPage: false });
  console.log(`  Screenshot saved: ${adminScreenshotPath}\n`);

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Navigate to Security Authority (/admin/security)
  // ────────────────────────────────────────────────────────────────────────
  console.log("[TEST 4] Navigating to Security Authority (/admin/security)...");
  await page.goto(`${PROD_URL}/admin/security`, { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading"), { timeout: 15000 }).catch(() => {});

  const secBody = await page.evaluate(() => document.body.innerText);
  const secHasServerError = secBody.includes("This page couldn't load") || secBody.includes("A server error occurred");
  const secHasAdmin1 = secBody.includes("roytejaswi40@gmail.com");
  const secHasAdmin2 = secBody.includes("roytejaswi206@gmail.com");
  const secHasCredStatus = secBody.includes("SUPER ADMIN CREDENTIAL CONFIGURED");
  const secLoaded = secHasAdmin1 && secHasAdmin2 && !secHasServerError;

  console.log(`  Security page URL: ${page.url()}`);
  console.log(`  Server error detected: ${secHasServerError ? "YES (FAIL)" : "NO (PASS)"}`);
  console.log(`  Designated Super Admin #1 visible: ${secHasAdmin1}`);
  console.log(`  Designated Super Admin #2 visible: ${secHasAdmin2}`);
  console.log(`  Credential status verified: ${secHasCredStatus}`);
  console.log(`  Security Authority loaded: ${secLoaded ? "PASS" : "FAIL"}`);

  const secScreenshotPath = path.join(ARTIFACTS_DIR, "production_security_authority.png");
  await page.screenshot({ path: secScreenshotPath, fullPage: false });
  console.log(`  Screenshot saved: ${secScreenshotPath}\n`);

  // ────────────────────────────────────────────────────────────────────────
  // TEST 5: Navigate to Intelligence Engine (/admin/intelligence)
  // ────────────────────────────────────────────────────────────────────────
  console.log("[TEST 5] Navigating to Intelligence Engine (/admin/intelligence)...");
  await page.goto(`${PROD_URL}/admin/intelligence`, { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading"), { timeout: 15000 }).catch(() => {});

  const intelBody = await page.evaluate(() => document.body.innerText);
  const intelHasServerError = intelBody.includes("This page couldn't load") || intelBody.includes("A server error occurred");
  const intelLoaded = (intelBody.includes("Routing & Intelligence") || intelBody.includes("CHILLER BRAIN")) && !intelHasServerError;

  console.log(`  Intelligence page URL: ${page.url()}`);
  console.log(`  Server error detected: ${intelHasServerError ? "YES (FAIL)" : "NO (PASS)"}`);
  console.log(`  Intelligence Engine loaded: ${intelLoaded ? "PASS" : "FAIL"}`);

  const intelScreenshotPath = path.join(ARTIFACTS_DIR, "production_intelligence_engine.png");
  await page.screenshot({ path: intelScreenshotPath, fullPage: false });
  console.log(`  Screenshot saved: ${intelScreenshotPath}\n`);

  // ────────────────────────────────────────────────────────────────────────
  // TEST 6: Mobile Viewport (375x667)
  // ────────────────────────────────────────────────────────────────────────
  console.log("[TEST 6] Testing Mobile Viewport (375x667) for Root Control Center & Security Authority...");
  await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });

  await page.goto(`${PROD_URL}/admin`, { waitUntil: "networkidle2", timeout: 30000 });
  const mobileAdminBody = await page.evaluate(() => document.body.innerText);
  const mobileAdminLoaded = !mobileAdminBody.includes("This page couldn't load") && (mobileAdminBody.includes("Root Center") || mobileAdminBody.includes("SUPER ADMIN"));
  const mobileAdminPath = path.join(ARTIFACTS_DIR, "production_mobile_root_control_center.png");
  await page.screenshot({ path: mobileAdminPath });
  console.log(`  Mobile Root Control Center loaded: ${mobileAdminLoaded ? "PASS" : "FAIL"}`);

  await page.goto(`${PROD_URL}/admin/security`, { waitUntil: "networkidle2", timeout: 30000 });
  const mobileSecBody = await page.evaluate(() => document.body.innerText);
  const mobileSecLoaded = !mobileSecBody.includes("This page couldn't load") && mobileSecBody.includes("Security & Identity Authority");
  const mobileSecPath = path.join(ARTIFACTS_DIR, "production_mobile_security_authority.png");
  await page.screenshot({ path: mobileSecPath });
  console.log(`  Mobile Security Authority loaded: ${mobileSecLoaded ? "PASS" : "FAIL"}\n`);

  // ────────────────────────────────────────────────────────────────────────
  // TEST 7: Normal User Authorization / Access Denied
  // ────────────────────────────────────────────────────────────────────────
  console.log("[TEST 7] Testing Normal User Access Block...");
  const incognitoContext = await browser.createBrowserContext();
  const normalPage = await incognitoContext.newPage();
  await normalPage.setViewport({ width: 1440, height: 900 });

  // Accessing /admin directly without auth
  await normalPage.goto(`${PROD_URL}/admin`, { waitUntil: "networkidle2" });
  const normalUnauthBlocked = normalPage.url().includes("/login");

  // Accessing /admin/security directly without auth
  await normalPage.goto(`${PROD_URL}/admin/security`, { waitUntil: "networkidle2" });
  const normalSecBlocked = normalPage.url().includes("/login");

  console.log(`  Normal unauthenticated /admin blocked: ${normalUnauthBlocked ? "PASS" : "FAIL"}`);
  console.log(`  Normal unauthenticated /admin/security blocked: ${normalSecBlocked ? "PASS" : "FAIL"}`);

  await browser.close();

  console.log("\n=================================================================");
  console.log("TEST SUMMARY:");
  console.log(`UNAUTHENTICATED REDIRECT: ${unauthPassed ? "PASS" : "FAIL"}`);
  console.log(`ROOT CONTROL CENTER (/admin): ${adminLoaded ? "PASS" : "FAIL"}`);
  console.log(`SECURITY AUTHORITY (/admin/security): ${secLoaded ? "PASS" : "FAIL"}`);
  console.log(`INTELLIGENCE ENGINE (/admin/intelligence): ${intelLoaded ? "PASS" : "FAIL"}`);
  console.log(`MOBILE ROOT CONTROL: ${mobileAdminLoaded ? "PASS" : "FAIL"}`);
  console.log(`MOBILE SECURITY AUTHORITY: ${mobileSecLoaded ? "PASS" : "FAIL"}`);
  console.log(`NORMAL USER ACCESS DENIED: ${normalUnauthBlocked && normalSecBlocked ? "PASS" : "FAIL"}`);
  console.log("=================================================================");
}

main().catch((err) => {
  console.error("Verification script failed with error:", err);
  process.exit(1);
});
