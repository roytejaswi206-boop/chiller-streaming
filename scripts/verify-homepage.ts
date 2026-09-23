import puppeteer from "puppeteer-core";
import * as path from "path";

const SCREENSHOTS_DIR = path.resolve(
  "C:/Users/Tejaswi/.gemini/antigravity-ide/brain/f9a5518b-6d9b-4898-acab-ea2b4d148949"
);

async function verifyHomepage() {
  console.log("================================================================");
  console.log("   FINAL HANDOFF VERIFICATION: http://localhost:3000            ");
  console.log("================================================================");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1280,850",
    ],
    defaultViewport: {
      width: 1280,
      height: 850,
    },
  });

  const page = await browser.newPage();

  try {
    const url = "http://localhost:3000";
    console.log(`🌐 Navigating to ${url}...`);
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 25000 });

    const status = response?.status();
    console.log(`  - HTTP Status: ${status}`);

    const title = await page.title();
    console.log(`  - Page Title: "${title}"`);

    const hasLogo = await page.evaluate(() => {
      const el = document.querySelector('img[alt*="Chiller"], a[href="/"]');
      return !!el;
    });
    console.log(`  - Brand Logo / Home link present: ${hasLogo}`);

    const heroPresent = await page.evaluate(() => {
      return !!document.querySelector('main, section, div[class*="Hero"], div[class*="hero"]');
    });
    console.log(`  - Main content / Hero present: ${heroPresent}`);

    const shot = path.join(SCREENSHOTS_DIR, "qa_final_homepage.png");
    await page.screenshot({ path: shot });
    console.log(`  ✅ Final Homepage Screenshot captured: ${shot}`);

    if (status !== 200) {
      throw new Error(`Expected HTTP 200, got ${status}`);
    }

    console.log("\n================================================================");
    console.log("   ✅ CHILLER HOMEPAGE CONFIRMED RUNNING & ACCESSIBLE!          ");
    console.log("================================================================");
  } finally {
    await browser.close();
  }
}

verifyHomepage().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
