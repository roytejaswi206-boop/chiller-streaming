import puppeteer from "puppeteer-core";

const BASE_URL = "http://localhost:3000";

async function profileWatchAndTouch() {
  console.log("================================================================");
  console.log("   CHILLER TOUCH & WATCH EXPERIENCE MOBILE PROFILER             ");
  console.log("================================================================");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });

    const client = await page.createCDPSession();
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("chiller_intro_seen", "true");
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle2" });

    console.log("\n[1] Testing Card Tap Responsiveness...");
    // Find the first visible MediaCard
    const card = await page.$("a[href^='/movies/'], a[href^='/anime/'], a[href^='/series/']");
    if (!card) {
      console.log("    No card found!");
      return;
    }

    const cardHref = await page.evaluate((el) => el.getAttribute("href"), card);
    console.log(`    Tapping card: ${cardHref}`);

    const cardTapStart = Date.now();
    await card.tap();
    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
    const cardNavTime = Date.now() - cardTapStart;
    console.log(`    Card Tap -> Detail page loaded in: ${cardNavTime} ms (URL: ${page.url()})`);

    // On detail page, check DOM & Backdrop-blur
    const detailMetrics = await page.evaluate(() => {
      const domNodes = document.querySelectorAll("*").length;
      const blurs = Array.from(document.querySelectorAll("*")).filter((el) => {
        const cls = typeof el.className === "string" ? el.className : (el.getAttribute("class") || "");
        return cls.includes("backdrop-blur");
      }).length;
      return { domNodes, blurs };
    });
    console.log(`    Detail DOM Nodes: ${detailMetrics.domNodes}, Blur elements: ${detailMetrics.blurs}`);

    // Find Watch button and tap it
    console.log("\n[2] Testing Watch Button Tap...");
    const watchBtn = await page.$("a[href^='/watch/']");
    let watchNavTime = 0;
    if (watchBtn) {
      await watchBtn.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
      await new Promise((r) => setTimeout(r, 400));
      const watchStart = Date.now();
      await page.evaluate(() => {
        const btn = document.querySelector("a[href^='/watch/']") as HTMLElement;
        if (btn) btn.click();
      });
      await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
      watchNavTime = Date.now() - watchStart;
      console.log(`    Watch Tap -> Player loaded in: ${watchNavTime} ms (URL: ${page.url()})`);
    } else {
      console.log("    Watch button not found directly, navigating directly to test watch route...");
      const watchStart = Date.now();
      await page.goto(`${BASE_URL}/watch/movie/550`, { waitUntil: "domcontentloaded" });
      watchNavTime = Date.now() - watchStart;
      console.log(`    Direct Watch route loaded in: ${watchNavTime} ms`);
    }

    // Measure Watch Page DOM and Player Controls
    const watchMetrics = await page.evaluate(() => {
      const domNodes = document.querySelectorAll("*").length;
      const blurs = Array.from(document.querySelectorAll("*")).filter((el) => {
        const cls = typeof el.className === "string" ? el.className : (el.getAttribute("class") || "");
        return cls.includes("backdrop-blur");
      }).length;
      const playerPresent = Boolean(document.querySelector("#chiller-active-player, video"));
      const episodesCount = document.querySelectorAll("button[aria-label*='Episode']").length;
      return { domNodes, blurs, playerPresent, episodesCount };
    });

    console.log("\n[3] Watch Experience Metrics:");
    console.log(`    Watch Page DOM Nodes: ${watchMetrics.domNodes}`);
    console.log(`    Backdrop-Blur Filter Elements: ${watchMetrics.blurs}`);
    console.log(`    Player Present: ${watchMetrics.playerPresent}`);
    console.log(`    Rendered Episode Buttons: ${watchMetrics.episodesCount}`);

    console.log("\n================================================================");
    console.log("   TOUCH & WATCH PROFILE COMPLETE                               ");
    console.log("================================================================");
  } catch (err) {
    console.error("Watch profile error:", err);
  } finally {
    await browser.close();
  }
}

profileWatchAndTouch();
