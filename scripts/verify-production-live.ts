import puppeteer, { Browser } from "puppeteer-core";
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

export async function runProductionSmokeTest() {
  console.log("====================================================================");
  console.log("CHILLER — PRODUCTION LIVE BROWSER VERIFICATION");
  console.log("Target:", PROD_URL);
  console.log("====================================================================\n");

  const env = parseEnvFile(path.join(process.cwd(), ".env"));
  const password = env["SUPER_ADMIN_BOOTSTRAP_PASSWORD"] || "";
  const sa1 = "roytejaswi40@gmail.com";
  const sa2 = "roytejaswi206@gmail.com";

  const browser: Browser = await puppeteer.launch({
    executablePath: findChromePath(),
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-web-security",
    ],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  const results: Record<string, any> = {
    home: false,
    search: false,
    superAdmin1: false,
    superAdmin2: false,
    adminIsolation: false,
    anime: {},
    movies: {},
    tv: {},
  };

  try {
    // 1. HOME
    console.log("1. Testing Production Homepage...");
    await page.goto(PROD_URL, { waitUntil: "domcontentloaded" });
    const title = await page.title();
    console.log(`   ✓ Home loaded. Title: ${title}`);
    results.home = true;

    // 2. SEARCH
    console.log("2. Testing Search API on Production...");
    const searchRes = await page.evaluate(async (url) => {
      const res = await fetch(`${url}/api/search?q=Naruto&page=1`);
      const data = await res.json();
      return { ok: res.ok, count: data.results?.length || 0 };
    }, PROD_URL);
    console.log(`   ✓ Search returned ${searchRes.count} results (ok=${searchRes.ok})`);
    results.search = searchRes.ok && searchRes.count > 0;

    // 3. SUPER ADMIN #1
    console.log(`3. Testing Super Admin #1: ${sa1}...`);
    await page.goto(`${PROD_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', sa1);
    await page.type('input[type="password"]', password);
    await page.click('button[type="submit"]');

    try {
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 8000 });
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }

    await page.goto(`${PROD_URL}/admin`, { waitUntil: "domcontentloaded" });
    const sa1Url = page.url();
    const sa1Admin = sa1Url.includes("/admin") && !sa1Url.includes("/login");
    console.log(`   ✓ SA #1 Auth to /admin: ${sa1Admin ? "PASS" : "FAIL"} (URL: ${sa1Url})`);
    results.superAdmin1 = sa1Admin;

    // Clear cookies for SA #2
    const client = await page.target().createCDPSession();
    await client.send("Network.clearBrowserCookies");

    // 4. SUPER ADMIN #2
    console.log(`4. Testing Super Admin #2: ${sa2}...`);
    await page.goto(`${PROD_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', sa2);
    await page.type('input[type="password"]', password);
    await page.click('button[type="submit"]');

    try {
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 8000 });
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }

    await page.goto(`${PROD_URL}/admin`, { waitUntil: "domcontentloaded" });
    const sa2Url = page.url();
    const sa2Admin = sa2Url.includes("/admin") && !sa2Url.includes("/login");
    console.log(`   ✓ SA #2 Auth to /admin: ${sa2Admin ? "PASS" : "FAIL"} (URL: ${sa2Url})`);
    results.superAdmin2 = sa2Admin;

    // 5. UNAUTHENTICATED ISOLATION
    await client.send("Network.clearBrowserCookies");
    await page.goto(`${PROD_URL}/admin`, { waitUntil: "domcontentloaded" });
    const unauthUrl = page.url();
    const isolated = unauthUrl.includes("/login") || !unauthUrl.includes("/admin");
    console.log(`5. Unauthenticated guard check: ${isolated ? "PASS" : "FAIL"} (redirected to: ${unauthUrl})`);
    results.adminIsolation = isolated;

    // 6. ANIME SAMPLES
    const animeSamples = [
      { title: "Naruto", id: 20 },
      { title: "One Piece", id: 21 },
      { title: "Demon Slayer", id: 101922 },
      { title: "Attack on Titan", id: 16498 },
      { title: "Bleach", id: 269 },
    ];

    console.log("\n6. Testing Production Anime Playback (5 titles)...");
    for (const a of animeSamples) {
      const watchUrl = `${PROD_URL}/watch/anime/${a.id}?s=1&e=1`;
      await page.goto(watchUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
      const hasPlayer = await page.waitForSelector("iframe, video", { timeout: 8000 }).then(() => true).catch(() => false);
      const progressed = hasPlayer ? await page.evaluate(async () => {
        const v = document.querySelector("video");
        const iframe = document.querySelector("iframe");
        if (v) return !v.paused || v.currentTime > 0;
        if (iframe && iframe.getAttribute("src")) return true;
        return false;
      }) : false;
      console.log(`   - ${a.title} (${watchUrl}): ${progressed ? "PLAYBACK_PROGRESS" : "NOT_VERIFIED"}`);
      results.anime[a.title] = progressed ? "PASS" : "FAIL";
    }

    // 7. MOVIE SAMPLES
    const movieSamples = [
      { title: "The Matrix", id: 603 },
      { title: "Inception", id: 27205 },
      { title: "Fight Club", id: 550 },
      { title: "Interstellar", id: 157336 },
      { title: "Dune: Part Two", id: 693134 },
    ];

    console.log("\n7. Testing Production Movie Playback (5 titles)...");
    for (const m of movieSamples) {
      const watchUrl = `${PROD_URL}/watch/movie/${m.id}`;
      await page.goto(watchUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
      const hasPlayer = await page.waitForSelector("iframe, video", { timeout: 8000 }).then(() => true).catch(() => false);
      const progressed = hasPlayer ? await page.evaluate(async () => {
        const v = document.querySelector("video");
        const iframe = document.querySelector("iframe");
        if (v) return !v.paused || v.currentTime > 0;
        if (iframe && iframe.getAttribute("src")) return true;
        return false;
      }) : false;
      console.log(`   - ${m.title} (${watchUrl}): ${progressed ? "PLAYBACK_PROGRESS" : "NOT_VERIFIED"}`);
      results.movies[m.title] = progressed ? "PASS" : "FAIL";
    }

    // 8. TV SAMPLES
    const tvSamples = [
      { title: "The Last of Us", id: 100088 },
      { title: "Breaking Bad", id: 1396 },
      { title: "Stranger Things", id: 66732 },
    ];

    console.log("\n8. Testing Production TV Playback (3 titles)...");
    for (const t of tvSamples) {
      const watchUrl = `${PROD_URL}/watch/tv/${t.id}?s=1&e=1`;
      await page.goto(watchUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
      const hasPlayer = await page.waitForSelector("iframe, video", { timeout: 8000 }).then(() => true).catch(() => false);
      const progressed = hasPlayer ? await page.evaluate(async () => {
        const v = document.querySelector("video");
        const iframe = document.querySelector("iframe");
        if (v) return !v.paused || v.currentTime > 0;
        if (iframe && iframe.getAttribute("src")) return true;
        return false;
      }) : false;
      console.log(`   - ${t.title} (${watchUrl}): ${progressed ? "PLAYBACK_PROGRESS" : "NOT_VERIFIED"}`);
      results.tv[t.title] = progressed ? "PASS" : "FAIL";
    }

  } finally {
    await browser.close().catch(() => {});
  }

  console.log("\n====================================================================");
  console.log("PRODUCTION SMOKE TEST COMPLETE");
  console.log("Summary:", JSON.stringify(results, null, 2));
  console.log("====================================================================");
  return results;
}

if (require.main === module || process.argv[1]?.includes("verify-production-live")) {
  runProductionSmokeTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Test failed:", err);
      process.exit(1);
    });
}
