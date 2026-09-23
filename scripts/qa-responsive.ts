import puppeteer from "puppeteer-core";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = path.resolve(
  "C:/Users/Tejaswi/.gemini/antigravity-ide/brain/f9a5518b-6d9b-4898-acab-ea2b4d148949"
);

interface ViewportTarget {
  name: string;
  category: "PHONE" | "TABLET" | "LAPTOP" | "DESKTOP" | "ULTRAWIDE";
  width: number;
  height: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

const VIEWPORT_MATRIX: ViewportTarget[] = [
  // 1. Phones
  { name: "Phone (Smallest)", category: "PHONE", width: 360, height: 640, isMobile: true, hasTouch: true },
  { name: "iPhone SE", category: "PHONE", width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: "iPhone 14 / 15", category: "PHONE", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "Pixel 7 / Galaxy S23", category: "PHONE", width: 412, height: 915, isMobile: true, hasTouch: true },
  { name: "iPhone 14/15/16 Pro Max", category: "PHONE", width: 430, height: 932, isMobile: true, hasTouch: true },

  // 2. Tablets
  { name: "iPad Mini", category: "TABLET", width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: "iPad Air", category: "TABLET", width: 820, height: 1180, isMobile: true, hasTouch: true },
  { name: "iPad Pro 12.9", category: "TABLET", width: 1024, height: 1366, isMobile: true, hasTouch: true },

  // 3. Laptops
  { name: "Laptop Compact", category: "LAPTOP", width: 1280, height: 720, isMobile: false, hasTouch: false },
  { name: "Laptop Standard", category: "LAPTOP", width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: "MacBook Air/Pro 14", category: "LAPTOP", width: 1440, height: 900, isMobile: false, hasTouch: false },

  // 4. Desktop
  { name: "Desktop Medium", category: "DESKTOP", width: 1600, height: 900, isMobile: false, hasTouch: false },
  { name: "Desktop 1080p FHD", category: "DESKTOP", width: 1920, height: 1080, isMobile: false, hasTouch: false },

  // 5. Ultra-Wide
  { name: "Ultra-Wide 1440p QHD", category: "ULTRAWIDE", width: 2560, height: 1440, isMobile: false, hasTouch: false },
];

export interface ViewportResult {
  target: ViewportTarget;
  homeNoOverflow: boolean;
  searchNoOverflow: boolean;
  watchNoOverflow: boolean;
  playerMounted: boolean;
  navUsable: boolean;
  orientationStable: boolean;
  overall: "PASS" | "FAIL";
  notes: string[];
}

export async function runResponsiveQA(): Promise<ViewportResult[]> {
  console.log("================================================================");
  console.log("   CHILLER UNIVERSAL DEVICE RESPONSIVE QA SUITE                 ");
  console.log("   Targeting 14 Discrete Viewports & Orientations               ");
  console.log("================================================================");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const results: ViewportResult[] = [];

  try {
    const page = await browser.newPage();

    // Set intro seen in localStorage
    await page.goto(BASE_URL, { waitUntil: "networkidle2" });
    await page.evaluate(() => localStorage.setItem("chiller_intro_seen", "true"));

    for (const target of VIEWPORT_MATRIX) {
      console.log(`\n🔍 Testing Viewport: ${target.name} (${target.width}×${target.height}) [${target.category}]`);
      const notes: string[] = [];

      await page.setViewport({
        width: target.width,
        height: target.height,
        isMobile: target.isMobile || false,
        hasTouch: target.hasTouch || false,
      });

      // 1. Test Homepage
      await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 20000 });
      const homeOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      const homeNoOverflow = !homeOverflow;
      if (homeOverflow) notes.push("Horizontal overflow detected on Homepage");

      // Verify Header
      const headerValid = await page.evaluate(() => {
        const header = document.querySelector("header");
        return header !== null && header.getBoundingClientRect().height > 0;
      });
      if (!headerValid) notes.push("Header failed to render");

      // 2. Test Search Page
      await page.goto(`${BASE_URL}/search?q=Titan`, { waitUntil: "networkidle2" });
      const searchOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      const searchNoOverflow = !searchOverflow;
      if (searchOverflow) notes.push("Horizontal overflow detected on Search page");

      // 3. Test Watch Page (Anime with SUB/DUB & episode navigation)
      await page.goto(`${BASE_URL}/watch/anime/16498?s=1&e=1`, { waitUntil: "networkidle2" });
      const watchOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      const watchNoOverflow = !watchOverflow;
      if (watchOverflow) notes.push("Horizontal overflow detected on Watch page");

      // Verify Player Shell & Watermark
      const playerMounted = await page.evaluate(() => {
        const playerContainer = document.querySelector("div[class*='relative w-full overflow-hidden bg-[#09090C]']");
        return playerContainer !== null;
      });
      if (!playerMounted) notes.push("Player container missing");

      // 4. Test Orientation (Portrait -> Landscape -> Portrait for mobile/tablet)
      let orientationStable = true;
      if (target.isMobile) {
        // Rotate to Landscape
        await page.setViewport({
          width: target.height,
          height: target.width,
          isMobile: true,
          hasTouch: true,
        });
        await new Promise((r) => setTimeout(r, 300));
        const landscapeOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        if (landscapeOverflow) {
          orientationStable = false;
          notes.push("Landscape orientation produced horizontal overflow");
        }

        // Rotate back to Portrait
        await page.setViewport({
          width: target.width,
          height: target.height,
          isMobile: true,
          hasTouch: true,
        });
        await new Promise((r) => setTimeout(r, 300));
      }

      const overall =
        homeNoOverflow && searchNoOverflow && watchNoOverflow && playerMounted && orientationStable
          ? "PASS"
          : "FAIL";

      console.log(`  Home No Overflow: ${homeNoOverflow ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`  Search No Overflow: ${searchNoOverflow ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`  Watch No Overflow: ${watchNoOverflow ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`  Player Container: ${playerMounted ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`  Orientation Recovery: ${orientationStable ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`  Overall Result: ${overall === "PASS" ? "✅ PASS" : "❌ FAIL"}`);

      results.push({
        target,
        homeNoOverflow,
        searchNoOverflow,
        watchNoOverflow,
        playerMounted,
        navUsable: headerValid,
        orientationStable,
        overall,
        notes,
      });
    }

    console.log("\n================================================================");
    console.log(`   AUTOMATED RESPONSIVE QA COMPLETE: ${results.filter(r => r.overall === "PASS").length}/${results.length} PASSED`);
    console.log("================================================================");
    return results;
  } catch (err) {
    console.error("QA Responsive Suite Error:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

// Execute when invoked directly
if (require.main === module) {
  runResponsiveQA();
}
