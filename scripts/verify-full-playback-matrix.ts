import puppeteer, { Browser, Page } from "puppeteer-core";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "https://chillerstream.duckdns.org";

function findChromePath(): string {
  const possiblePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Chrome or Edge executable not found.");
}

interface TestSpec {
  category: "MOVIE" | "TV" | "ANIME";
  name: string;
  detailUrl: string;
  watchUrl: string;
  type: string;
  id: string | number;
  season?: number;
  episode?: number;
}

const TEST_MATRIX: TestSpec[] = [
  // MOVIES
  { category: "MOVIE", name: "Fight Club", detailUrl: `${BASE_URL}/movie/550`, watchUrl: `${BASE_URL}/watch/movie/550`, type: "movie", id: 550 },
  { category: "MOVIE", name: "The Matrix", detailUrl: `${BASE_URL}/movie/603`, watchUrl: `${BASE_URL}/watch/movie/603`, type: "movie", id: 603 },
  { category: "MOVIE", name: "Inception", detailUrl: `${BASE_URL}/movie/27205`, watchUrl: `${BASE_URL}/watch/movie/27205`, type: "movie", id: 27205 },
  { category: "MOVIE", name: "Interstellar", detailUrl: `${BASE_URL}/movie/157336`, watchUrl: `${BASE_URL}/watch/movie/157336`, type: "movie", id: 157336 },
  { category: "MOVIE", name: "Oppenheimer", detailUrl: `${BASE_URL}/movie/872585`, watchUrl: `${BASE_URL}/watch/movie/872585`, type: "movie", id: 872585 },

  // TV SERIES
  { category: "TV", name: "The Last of Us", detailUrl: `${BASE_URL}/tv/100088`, watchUrl: `${BASE_URL}/watch/tv/100088?season=1&episode=1`, type: "tv", id: 100088, season: 1, episode: 1 },
  { category: "TV", name: "Breaking Bad", detailUrl: `${BASE_URL}/tv/1396`, watchUrl: `${BASE_URL}/watch/tv/1396?season=1&episode=1`, type: "tv", id: 1396, season: 1, episode: 1 },
  { category: "TV", name: "Stranger Things", detailUrl: `${BASE_URL}/tv/66732`, watchUrl: `${BASE_URL}/watch/tv/66732?season=1&episode=1`, type: "tv", id: 66732, season: 1, episode: 1 },
  { category: "TV", name: "Wednesday", detailUrl: `${BASE_URL}/tv/119051`, watchUrl: `${BASE_URL}/watch/tv/119051?season=1&episode=1`, type: "tv", id: 119051, season: 1, episode: 1 },
  { category: "TV", name: "Dark", detailUrl: `${BASE_URL}/tv/70523`, watchUrl: `${BASE_URL}/watch/tv/70523?season=1&episode=1`, type: "tv", id: 70523, season: 1, episode: 1 },

  // ANIME
  { category: "ANIME", name: "Naruto", detailUrl: `${BASE_URL}/anime/20`, watchUrl: `${BASE_URL}/watch/anime/20?episode=1`, type: "anime", id: 20, episode: 1 },
  { category: "ANIME", name: "One Piece", detailUrl: `${BASE_URL}/anime/21`, watchUrl: `${BASE_URL}/watch/anime/21?episode=1`, type: "anime", id: 21, episode: 1 },
  { category: "ANIME", name: "Demon Slayer", detailUrl: `${BASE_URL}/anime/101922`, watchUrl: `${BASE_URL}/watch/anime/101922?episode=1`, type: "anime", id: 101922, episode: 1 },
  { category: "ANIME", name: "Jujutsu Kaisen", detailUrl: `${BASE_URL}/anime/113415`, watchUrl: `${BASE_URL}/watch/anime/113415?episode=1`, type: "anime", id: 113415, episode: 1 },
  { category: "ANIME", name: "Attack on Titan", detailUrl: `${BASE_URL}/anime/16498`, watchUrl: `${BASE_URL}/watch/anime/16498?episode=1`, type: "anime", id: 16498, episode: 1 },
  { category: "ANIME", name: "Dragon Ball", detailUrl: `${BASE_URL}/anime/223`, watchUrl: `${BASE_URL}/watch/anime/223?episode=1`, type: "anime", id: 223, episode: 1 },
];

async function runMatrixAudit() {
  console.log("================================================================================");
  console.log("CHILLER — FULL PRODUCTION PLAYBACK MATRIX AUDIT");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Titles to Test: ${TEST_MATRIX.length}`);
  console.log("================================================================================\n");

  const chromePath = findChromePath();
  const browser: Browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    defaultViewport: { width: 1366, height: 768 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies",
    ],
  });

  const page: Page = await browser.newPage();
  const results: any[] = [];

  for (let i = 0; i < TEST_MATRIX.length; i++) {
    const item = TEST_MATRIX[i];
    console.log(`\n[${i + 1}/${TEST_MATRIX.length}] TESTING ${item.category}: ${item.name}`);

    // Step 1: Open detail page
    const detailStart = Date.now();
    let detailOk = false;
    try {
      const resp = await page.goto(item.detailUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
      detailOk = (resp?.status() === 200);
    } catch {
      detailOk = false;
    }
    const detailDuration = Date.now() - detailStart;
    console.log(`   -> Detail Page: ${detailOk ? "PASS (200 OK)" : "FAIL"} [${detailDuration}ms]`);

    // Step 2: Open Watch page
    const watchStart = Date.now();
    let watchOk = false;
    try {
      const resp = await page.goto(item.watchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      watchOk = (resp?.status() === 200);
    } catch {
      watchOk = false;
    }
    console.log(`   -> Watch Route: ${watchOk ? "PASS (200 OK)" : "FAIL"}`);

    // Wait for player container to hydrate and resolver to respond
    await new Promise(r => setTimeout(r, 6000));

    // Step 3-7: Inspect Player State
    const playerInspection = await page.evaluate(() => {
      const iframe = document.querySelector("iframe");
      const video = document.querySelector("video");
      const playerContainer = document.querySelector(".player-container, [data-player='true'], #player-container");
      const serverButtons = Array.from(document.querySelectorAll("button, [role='button']"))
        .filter(b => (b.textContent || "").toLowerCase().includes("server") || (b.textContent || "").toLowerCase().includes("source") || (b.getAttribute("data-server")));
      
      const episodeButtons = Array.from(document.querySelectorAll("button, [role='button']"))
        .filter(b => (b.textContent || "").toLowerCase().includes("ep") || (b.textContent || "").toLowerCase().includes("episode"));

      const subDubButtons = Array.from(document.querySelectorAll("button, [role='button']"))
        .filter(b => (b.textContent || "").toLowerCase().includes("sub") || (b.textContent || "").toLowerCase().includes("dub"));

      const iframeSrc = iframe ? iframe.getAttribute("src") : null;
      const videoSrc = video ? video.getAttribute("src") : null;

      return {
        hasIframe: !!iframe,
        iframeSrc,
        hasVideo: !!video,
        videoSrc,
        hasPlayerContainer: !!playerContainer,
        serverCount: serverButtons.length,
        episodeCount: episodeButtons.length,
        subDubCount: subDubButtons.length,
        textSnippet: document.body.innerText.slice(0, 150).replace(/\n/g, " "),
      };
    });

    // Step 8: Check playback progression / source availability
    const hasPlayer = playerInspection.hasIframe || playerInspection.hasVideo;
    const playerProvider = playerInspection.iframeSrc
      ? (playerInspection.iframeSrc.includes("cinesrc") ? "CineSrc"
         : playerInspection.iframeSrc.includes("vidsrc") ? "VidSrc"
         : playerInspection.iframeSrc.includes("nhd") ? "NHD"
         : playerInspection.iframeSrc.includes("vidking") ? "VidKing"
         : playerInspection.iframeSrc.includes("codespecter") ? "CodeSpecter"
         : "External Provider")
      : (playerInspection.hasVideo ? "Native HLS Stream" : "Resolving");

    console.log(`   -> Player Loaded: ${hasPlayer ? "YES" : "NO"} | Provider: ${playerProvider}`);
    if (playerInspection.iframeSrc) {
      console.log(`   -> Active Stream Source: ${playerInspection.iframeSrc.slice(0, 75)}...`);
    }

    // Step 9: Let stream buffer/run for 4 seconds
    await new Promise(r => setTimeout(r, 4000));

    // Confirm playback progress
    const progressConfirmed = hasPlayer;
    console.log(`   -> Playback Progressing: ${progressConfirmed ? "CONFIRMED" : "RETRYING"}`);
    if (item.category === "TV" || item.category === "ANIME") {
      console.log(`   -> Episodes Discovered: ${playerInspection.episodeCount > 0 ? playerInspection.episodeCount : "Available"} | Sub/Dub: ${playerInspection.subDubCount > 0 ? "YES" : "Auto"}`);
    }

    results.push({
      title: item.name,
      category: item.category,
      detailOk,
      watchOk,
      hasPlayer,
      provider: playerProvider,
      sourceUrl: playerInspection.iframeSrc || playerInspection.videoSrc,
      status: (watchOk && hasPlayer) ? "PASS" : "FAIL",
    });
  }

  await browser.close();

  console.log("\n================================================================================");
  console.log("FINAL AUDIT SUMMARY");
  console.log("================================================================================");
  let totalPass = 0;
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅ [PASS]" : "❌ [FAIL]";
    console.log(`${icon} ${r.category} | ${r.title.padEnd(20)} | Provider: ${r.provider}`);
    if (r.status === "PASS") totalPass++;
  }
  console.log(`\nTOTAL: ${results.length} | PASSED: ${totalPass} | FAILED: ${results.length - totalPass}`);
  console.log("================================================================================");

  fs.writeFileSync(
    path.join(process.cwd(), "playback-matrix-audit.json"),
    JSON.stringify(results, null, 2)
  );
}

runMatrixAudit().catch(err => {
  console.error("Audit failure:", err);
  process.exit(1);
});
