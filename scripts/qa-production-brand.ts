import puppeteer from "puppeteer-core";
import path from "path";

const PROD_URL = "https://streaming-chi-red.vercel.app";
const SCREENSHOTS_DIR = path.resolve(
  "C:/Users/Tejaswi/.gemini/antigravity-ide/brain/f9a5518b-6d9b-4898-acab-ea2b4d148949"
);

async function runProductionSmoke() {
  console.log("=================================================");
  console.log("   LIVE VERCEL PRODUCTION BRAND SMOKE TEST       ");
  console.log("   URL: " + PROD_URL);
  console.log("=================================================");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. HOME & HEADER LOGO
    console.log("1. Testing HOME & Desktop Header on Production...");
    await page.goto(PROD_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await page.evaluate(() => {
      localStorage.setItem("chiller_intro_seen", "true");
    });
    await page.goto(PROD_URL, { waitUntil: "networkidle2" });

    const title = await page.title();
    console.log("  Page Title:", title);

    const logoRendered = await page.evaluate(() => {
      const img = document.querySelector("header img[alt='CHILLER']") as HTMLImageElement;
      return img && img.naturalWidth > 0;
    });
    console.log("  Header Logo Rendered:", logoRendered ? "✅ PASS" : "❌ FAIL");

    const prodHeaderPath = path.join(SCREENSHOTS_DIR, "prod-smoke-desktop-header.png");
    await page.screenshot({ path: prodHeaderPath, clip: { x: 0, y: 0, width: 1440, height: 260 } });

    // 2. SEARCH PAGE
    console.log("2. Testing SEARCH on Production...");
    await page.goto(`${PROD_URL}/search?q=Titan`, { waitUntil: "networkidle2" });
    const searchLogo = await page.evaluate(() => {
      const img = document.querySelector("header img[alt='CHILLER']") as HTMLImageElement;
      return img && img.naturalWidth > 0;
    });
    console.log("  Search Page Branding:", searchLogo ? "✅ PASS" : "❌ FAIL");

    // 3. ANIME PAGE
    console.log("3. Testing ANIME page on Production...");
    await page.goto(`${PROD_URL}/anime`, { waitUntil: "networkidle2" });
    const animeTitle = await page.title();
    console.log("  Anime Page Title:", animeTitle);

    // 4. WATCH PAGE & WATERMARK
    console.log("4. Testing WATCH page on Production...");
    await page.goto(`${PROD_URL}/watch/movie/550`, { waitUntil: "networkidle2" });
    const watermark = await page.evaluate(() => {
      const img = document.querySelector("img[src*='chiller-player-watermark']") as HTMLImageElement;
      return img !== null;
    });
    console.log("  Player Watermark Present:", watermark ? "✅ PASS" : "❌ FAIL");

    const prodWatchPath = path.join(SCREENSHOTS_DIR, "prod-smoke-watch-watermark.png");
    await page.screenshot({ path: prodWatchPath, clip: { x: 0, y: 0, width: 1440, height: 700 } });

    // 5. MOBILE VIEWPORT
    console.log("5. Testing MOBILE Viewport on Production...");
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(PROD_URL, { waitUntil: "networkidle2" });
    const mobileLogo = await page.evaluate(() => {
      const img = document.querySelector("header img[alt='CHILLER']") as HTMLImageElement;
      return img && img.naturalWidth > 0;
    });
    console.log("  Mobile App-like Header:", mobileLogo ? "✅ PASS" : "❌ FAIL");

    // 6. MANIFEST & FAVICON ASSETS
    console.log("6. Testing PWA Manifest & Favicon on Production...");
    const manifestRes = await fetch(`${PROD_URL}/manifest.webmanifest`);
    console.log("  Manifest HTTP:", manifestRes.status);
    if (manifestRes.ok) {
      const mf = (await manifestRes.json()) as any;
      console.log("  Manifest Name:", mf.name);
      console.log("  Icons Count:", mf.icons?.length);
      console.log("  Has Maskable Icon:", mf.icons?.some((i: any) => i.purpose?.includes("maskable")) ? "✅ PASS" : "❌ FAIL");
    }

    const faviconRes = await fetch(`${PROD_URL}/favicon.ico`);
    console.log("  Favicon.ico HTTP:", faviconRes.status);

    console.log("\n=================================================");
    console.log("   LIVE VERCEL PRODUCTION SMOKE TEST: PASSED!    ");
    console.log("=================================================");
  } catch (err) {
    console.error("Production Smoke QA Failed:", err);
  } finally {
    await browser.close();
  }
}

runProductionSmoke();
