import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const LOCAL_URL = "http://localhost:3000";

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

async function verifyBrowserLogin() {
  const env = parseEnvFile(path.join(process.cwd(), ".env"));
  const password = env["SUPER_ADMIN_BOOTSTRAP_PASSWORD"] || "";
  const sa1 = "roytejaswi40@gmail.com";
  const sa2 = "roytejaswi206@gmail.com";

  console.log("=== BROWSER LOGIN VERIFICATION ===");
  console.log("Testing on:", LOCAL_URL);

  const browser = await puppeteer.launch({
    executablePath: findChromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const adminRoutes = [
    "/admin",
    "/admin/security",
    "/admin/users",
    "/admin/providers",
    "/admin/intelligence",
    "/admin/playback-lab/anime",
    "/admin/playback-lab/general",
    "/admin/audit",
  ];

  // Test SA1
  console.log(`\nTesting Login for SA #1: ${sa1}`);
  await page.goto(`${LOCAL_URL}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', sa1);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });
  console.log(`Post-login URL: ${page.url()}`);

  for (const route of adminRoutes) {
    await page.goto(`${LOCAL_URL}${route}`, { waitUntil: "networkidle2" });
    const title = await page.title();
    const url = page.url();
    const content = await page.evaluate(() => document.body.innerText);
    const passed = url.includes(route) && !url.includes("/login");
    console.log(`  Route ${route}: ${passed ? "PASS" : "FAIL"} (URL: ${url})`);
  }

  // Clear cookies for SA2
  const client = await page.target().createCDPSession();
  await client.send("Network.clearBrowserCookies");

  // Test SA2
  console.log(`\nTesting Login for SA #2: ${sa2}`);
  await page.goto(`${LOCAL_URL}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', sa2);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });
  console.log(`Post-login URL: ${page.url()}`);

  for (const route of adminRoutes) {
    await page.goto(`${LOCAL_URL}${route}`, { waitUntil: "networkidle2" });
    const url = page.url();
    const passed = url.includes(route) && !url.includes("/login");
    console.log(`  Route ${route}: ${passed ? "PASS" : "FAIL"} (URL: ${url})`);
  }

  await browser.close();
  console.log("\n=== BROWSER LOGIN TESTS COMPLETE ===");
}

verifyBrowserLogin().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
