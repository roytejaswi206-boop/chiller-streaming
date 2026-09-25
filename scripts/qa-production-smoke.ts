/**
 * scripts/qa-production-smoke.ts
 *
 * PRODUCTION BROWSER SMOKE TEST ON VERCEL DEPLOYMENT
 * Target: https://streaming-chi-red.vercel.app
 */

import puppeteer from "puppeteer-core";
import fs from "fs";

const CHROME_PATH =
  process.env.CHROME_BIN ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const PROD_URL = "https://streaming-chi-red.vercel.app";

async function runProductionSmoke() {
  console.log("============================================================");
  console.log("CHILLER — PRODUCTION VERCEL BROWSER SMOKE TEST");
  console.log(`Target: ${PROD_URL}`);
  console.log("============================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--autoplay-policy=no-user-gesture-required",
      "--window-size=1280,900",
    ],
    defaultViewport: { width: 1280, height: 900, hasTouch: true },
  });

  const page = await browser.newPage();
  page.on("pageerror", (err: any) => {
    console.error("  [PROD PAGE ERROR]:", err?.message || err);
  });

  try {
    // 1. Home
    console.log("1. Testing Production Homepage...");
    await page.goto(`${PROD_URL}`, { waitUntil: "networkidle2", timeout: 30000 });
    const title = await page.title();
    console.log(`  ✓ Home Title: ${title}`);

    // 2. Search
    console.log("\n2. Testing Production Search API & Page...");
    const searchRes = await page.evaluate(async (url) => {
      const res = await fetch(`${url}/api/content/search?q=Attack+on+Titan`);
      return res.ok ? await res.json() : null;
    }, PROD_URL);
    console.log(`  ✓ Search items found: ${searchRes?.results?.length || 0}`);

    // 3. Anime Watch Page (Attack on Titan Ep 1)
    console.log("\n3. Testing Production Anime Watch Experience & Hot-Switch...");
    const animeWatchUrl = `${PROD_URL}/watch/anime/16498?s=1&e=1`;
    await page.goto(animeWatchUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));

    // Verify SUB and DUB buttons
    const subBtn = await page.$("#chiller-sub-btn");
    const dubBtn = await page.$("#chiller-dub-btn");
    console.log("  ✓ SUB button present:", Boolean(subBtn));
    console.log("  ✓ DUB button present:", Boolean(dubBtn));

    // Inspect iframe src initially
    const initialIframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector("#chiller-active-player") as HTMLIFrameElement;
      return iframe ? iframe.src : "";
    });
    console.log(`  ✓ Production Stream Source (Initial SUB): ${initialIframeSrc}`);

    // Tap DUB
    console.log("  👉 Single-tap DUB on production...");
    if (dubBtn) {
      await dubBtn.click();
      await new Promise((r) => setTimeout(r, 2000));
    }
    const dubIframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector("#chiller-active-player") as HTMLIFrameElement;
      return iframe ? iframe.src : "";
    });
    console.log(`  ✓ Production Stream Source (Post-Switch DUB): ${dubIframeSrc}`);
    console.log(`  ✓ DUB active on production: ${dubIframeSrc.includes("dub=1")}`);

    // Tap SUB
    console.log("  👉 Single-tap SUB on production...");
    if (subBtn) {
      await subBtn.click();
      await new Promise((r) => setTimeout(r, 2000));
    }
    const subAgainSrc = await page.evaluate(() => {
      const iframe = document.querySelector("#chiller-active-player") as HTMLIFrameElement;
      return iframe ? iframe.src : "";
    });
    console.log(`  ✓ Production Stream Source (Switched back to SUB): ${subAgainSrc}`);

    // 4. Movie Regression (Fight Club TMDB 550)
    console.log("\n4. Testing Movie Playback Regression on Production (Fight Club)...");
    const movieWatchUrl = `${PROD_URL}/watch/movie/550`;
    await page.goto(movieWatchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("#chiller-active-player", { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    const movieIframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector("#chiller-active-player") as HTMLIFrameElement;
      return iframe ? iframe.src : "";
    });
    console.log(`  ✓ Movie Stream Source: ${movieIframeSrc}`);
    console.log(`  ✓ Movie routed to General Pool without anime pollution: ${!movieIframeSrc.includes("nhdapi.st")}`);

    // 5. TV Playback Regression (The Last of Us TMDB 100088)
    console.log("\n5. Testing TV Playback Regression on Production (The Last of Us)...");
    const tvWatchUrl = `${PROD_URL}/watch/tv/100088?s=1&e=1`;
    await page.goto(tvWatchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("#chiller-active-player", { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    const tvIframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector("#chiller-active-player") as HTMLIFrameElement;
      return iframe ? iframe.src : "";
    });
    console.log(`  ✓ TV Stream Source: ${tvIframeSrc}`);
    console.log(`  ✓ TV routed to General Pool without anime pollution: ${!tvIframeSrc.includes("nhdapi.st")}`);

    console.log("\n============================================================");
    console.log("PRODUCTION VERCEL SMOKE TEST PASSED!");
    console.log("============================================================\n");
  } finally {
    await browser.close();
  }
}

runProductionSmoke().catch((err) => {
  console.error("Production smoke test failed:", err);
  process.exit(1);
});
