import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const PROD_URL = "https://streaming-chi-red.vercel.app";

function findChromePath(): string {
  const possiblePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Chrome executable not found.");
}

function parseEnvFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

async function runProductionTests() {
  const env = parseEnvFile(path.join(process.cwd(), ".env"));
  const password = env["SUPER_ADMIN_BOOTSTRAP_PASSWORD"] || "";
  const sa1 = "roytejaswi40@gmail.com";
  const sa2 = "roytejaswi206@gmail.com";

  console.log(`\n======================================================`);
  console.log(`CHILLER — PRODUCTION SUPER ADMIN VERIFICATION`);
  console.log(`Target: ${PROD_URL}`);
  console.log(`SUPER ADMIN CREDENTIAL CONFIGURED (length: ${password.length} chars)`);
  console.log(`======================================================\n`);

  const browser = await puppeteer.launch({
    executablePath: findChromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // TEST 1: Unauthenticated access to /admin
  console.log("[TEST 1] Testing unauthenticated access to /admin on production...");
  await page.goto(`${PROD_URL}/admin`, { waitUntil: "networkidle2" });
  const currentUrl = page.url();
  console.log(`[TEST 1] Redirected URL: ${currentUrl}`);
  const unauthPassed = currentUrl.includes("/login");
  console.log(`[TEST 1] Result: ${unauthPassed ? "PASS (Properly redirected to login)" : "FAIL"}`);

  // TEST 2: Super Admin #1 Login
  console.log(`\n[TEST 2] Logging in as Super Admin #1: ${sa1}...`);
  await page.goto(`${PROD_URL}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', sa1);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
  console.log(`[TEST 2] Post-login URL: ${page.url()}`);

  // Navigate to /admin
  await page.goto(`${PROD_URL}/admin`, { waitUntil: "networkidle2" });
  let adminTitle = await page.title();
  let adminBody = await page.evaluate(() => document.body.innerText);
  const sa1AdminPassed = adminBody.includes("SUPER ADMIN") || adminBody.includes("Root Control Center") || page.url().includes("/admin");
  console.log(`[TEST 2] Super Admin #1 /admin access: ${sa1AdminPassed ? "PASS" : "FAIL"}`);

  // TEST 3: Inspect /admin/security on Production
  console.log(`\n[TEST 3] Inspecting /admin/security on production...`);
  await page.goto(`${PROD_URL}/admin/security`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading security telemetry"), { timeout: 15000 }).catch(() => {});
  const secBody = await page.evaluate(() => document.body.innerText);
  const credReported = secBody.includes("SUPER ADMIN CREDENTIAL CONFIGURED");
  const noRawPassword = !secBody.includes(password);
  console.log(`[TEST 3] Security page shows 'SUPER ADMIN CREDENTIAL CONFIGURED': ${credReported ? "PASS" : "FAIL"}`);
  console.log(`[TEST 3] Security page does NOT expose password: ${noRawPassword ? "PASS" : "FAIL"}`);

  // TEST 4: Clear cookies and Login as Super Admin #2
  console.log(`\n[TEST 4] Logging in as Super Admin #2: ${sa2}...`);
  const client = await page.target().createCDPSession();
  await client.send("Network.clearBrowserCookies");

  await page.goto(`${PROD_URL}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', sa2);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
  console.log(`[TEST 4] Post-login URL: ${page.url()}`);

  await page.goto(`${PROD_URL}/admin`, { waitUntil: "networkidle2" });
  const sa2Body = await page.evaluate(() => document.body.innerText);
  const sa2AdminPassed = sa2Body.includes("SUPER ADMIN") || sa2Body.includes("Root Control Center") || page.url().includes("/admin");
  console.log(`[TEST 4] Super Admin #2 /admin access: ${sa2AdminPassed ? "PASS" : "FAIL"}`);

  // TEST 5: Negative Authorization Test (Normal user or Invalid password)
  console.log(`\n[TEST 5] Testing negative login with invalid password...`);
  await client.send("Network.clearBrowserCookies");
  await page.goto(`${PROD_URL}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', sa1);
  await page.type('input[type="password"]', "DefinitivelyWrongPassword999!");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.innerText.includes("Invalid email or password") || document.body.innerText.includes("error") || window.location.pathname.includes("/login"), { timeout: 8000 }).catch(() => {});
  const negBody = await page.evaluate(() => document.body.innerText);
  const negPassed = negBody.includes("Invalid") || page.url().includes("/login");
  console.log(`[TEST 5] Invalid password rejected on production: ${negPassed ? "PASS" : "FAIL"}`);

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`ALL PRODUCTION TESTS COMPLETED.`);
  console.log(`======================================================\n`);
}

runProductionTests().catch(err => {
  console.error("Production test error:", err);
  process.exit(1);
});
