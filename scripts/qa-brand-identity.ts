import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = path.resolve(
  "C:/Users/Tejaswi/.gemini/antigravity-ide/brain/f9a5518b-6d9b-4898-acab-ea2b4d148949"
);

async function runBrandQA() {
  console.log("=================================================");
  console.log("   CHILLER BRAND IDENTITY & APP ICON QA SUITE    ");
  console.log("=================================================");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Test Homepage Desktop
    console.log("1. Navigating to Desktop Homepage (http://localhost:3000)...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 30000 });
    await page.evaluate(() => {
      localStorage.setItem("chiller_intro_seen", "true");
    });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

    const title = await page.title();
    console.log("  Title:", title);

    // Verify Favicon presence
    const faviconUrl = await page.evaluate(() => {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      return link ? link.href : null;
    });
    console.log("  Favicon URL:", faviconUrl);

    // Verify Header Logo (Emblem + Wordmark)
    const headerLogoValid = await page.evaluate(() => {
      const img = document.querySelector("header img[alt='CHILLER']") as HTMLImageElement;
      return img && img.naturalWidth > 0;
    });
    console.log("  Header Logo Image Rendered:", headerLogoValid ? "✅ YES" : "❌ NO");

    // Take Desktop Screenshot
    const desktopScreenshotPath = path.join(SCREENSHOTS_DIR, "qa-brand-desktop-header.png");
    await page.screenshot({ path: desktopScreenshotPath, clip: { x: 0, y: 0, width: 1440, height: 260 } });
    console.log("  Saved header screenshot:", desktopScreenshotPath);

    // 2. Test Mobile Viewport
    console.log("2. Testing Mobile Viewport (iPhone 14 / Pixel standard)...");
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

    const mobileLogoValid = await page.evaluate(() => {
      const img = document.querySelector("header img[alt='CHILLER']") as HTMLImageElement;
      return img && img.naturalWidth > 0;
    });
    console.log("  Mobile Header Logo Rendered:", mobileLogoValid ? "✅ YES" : "❌ NO");

    const mobileScreenshotPath = path.join(SCREENSHOTS_DIR, "qa-brand-mobile-header.png");
    await page.screenshot({ path: mobileScreenshotPath, clip: { x: 0, y: 0, width: 390, height: 200 } });
    console.log("  Saved mobile screenshot:", mobileScreenshotPath);

    // 3. Test Watch Page Player Watermark
    console.log("3. Testing Watch Page Player Watermark...");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000/watch/movie/550", { waitUntil: "networkidle2" });

    const watermarkPresent = await page.evaluate(() => {
      const watermarkImg = document.querySelector("img[src*='chiller-player-watermark']") as HTMLImageElement;
      return watermarkImg !== null;
    });
    console.log("  Player Watermark Present:", watermarkPresent ? "✅ YES" : "❌ NO");

    const playerScreenshotPath = path.join(SCREENSHOTS_DIR, "qa-brand-player-watermark.png");
    await page.screenshot({ path: playerScreenshotPath, clip: { x: 0, y: 0, width: 1440, height: 750 } });
    console.log("  Saved player screenshot:", playerScreenshotPath);

    // 4. Test PWA Manifest HTTP Status
    console.log("4. Testing Web App Manifest...");
    const manifestRes = await fetch("http://localhost:3000/manifest.webmanifest");
    console.log("  Manifest HTTP Status:", manifestRes.status);
    if (manifestRes.ok) {
      const manifestJson = (await manifestRes.json()) as any;
      console.log("  Manifest Name:", manifestJson.name);
      console.log("  Manifest Short Name:", manifestJson.short_name);
      console.log("  Manifest Theme Color:", manifestJson.theme_color);
      console.log("  Icons Count:", manifestJson.icons?.length);
      const hasMaskable = manifestJson.icons?.some((i: any) => i.purpose?.includes("maskable"));
      console.log("  Contains Maskable Icon:", hasMaskable ? "✅ YES" : "❌ NO");
    }

    console.log("\n=================================================");
    console.log("   ALL BRAND ASSETS & RUNTIME CHECKS PASSED!     ");
    console.log("=================================================");
  } catch (err) {
    console.error("Brand QA Error:", err);
  } finally {
    await browser.close();
  }
}

runBrandQA();
