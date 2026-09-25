import puppeteer from "puppeteer-core";

const BASE_URL = "http://localhost:3000";

async function profileMobile() {
  console.log("================================================================");
  console.log("   CHILLER MOBILE PERFORMANCE EMERGENCY DIAGNOSTIC PROFILE      ");
  console.log("================================================================");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--enable-features=NetworkService,NetworkServiceInProcess",
    ],
  });

  try {
    const page = await browser.newPage();

    // Emulate Mobile Device (iPhone 14 / Pixel 7 hybrid: 393 x 852, touch enabled, DPR 3)
    await page.setViewport({
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
    );

    // CDP Session for CPU & Network emulation
    const client = await page.createCDPSession();
    // 4x CPU slowdown to simulate mid-tier mobile chip
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    // Mark intro seen so we profile the application itself
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("chiller_intro_seen", "true");
      document.cookie = "chiller_intro_seen=true; path=/; max-age=31536000";
    });

    // Track network metrics
    let totalRequests = 0;
    let imageRequests = 0;
    let scriptRequests = 0;
    let apiRequests = 0;
    let totalBytes = 0;
    const slowRequests: { url: string; time: number }[] = [];

    page.on("request", () => {
      totalRequests++;
    });

    page.on("response", async (res) => {
      const rt = res.request().resourceType();
      if (rt === "image") imageRequests++;
      if (rt === "script") scriptRequests++;
      if (rt === "fetch" || rt === "xhr") apiRequests++;

      try {
        const headers = res.headers();
        const len = headers["content-length"];
        if (len) totalBytes += parseInt(len, 10);
      } catch {}
    });

    console.log("\n[1] Profiling Mobile Homepage Under 4x CPU Throttling...");
    const navStart = Date.now();
    await page.goto(BASE_URL, { waitUntil: "networkidle2" });
    const fullLoadTime = Date.now() - navStart;

    // Collect DOM metrics, Backdrop-blur elements, and Performance entries
    const auditData = await page.evaluate(() => {
      const domNodes = document.querySelectorAll("*").length;
      const imagesCount = document.querySelectorAll("img").length;
      const backdropBlurElements = Array.from(document.querySelectorAll("*")).filter((el) => {
        const style = window.getComputedStyle(el);
        const cls = typeof el.className === "string" ? el.className : (el.getAttribute("class") || "");
        return (
          style.backdropFilter?.includes("blur") ||
          (style as any).webkitBackdropFilter?.includes("blur") ||
          cls.includes("backdrop-blur")
        );
      }).length;

      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const paint = performance.getEntriesByType("paint");
      const fcp = paint.find((p) => p.name === "first-contentful-paint");

      // Memory
      const memory = (performance as any).memory
        ? {
            usedJSHeapSize: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
            totalJSHeapSize: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
          }
        : null;

      // Check all horizontal rails
      const rails = document.querySelectorAll(".overflow-x-auto").length;

      return {
        domNodes,
        imagesCount,
        backdropBlurElements,
        rails,
        ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
        domInteractive: nav ? Math.round(nav.domInteractive) : null,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        fcp: fcp ? Math.round(fcp.startTime) : null,
        memory,
      };
    });

    console.log("  Navigation & Paint Metrics:");
    console.log(`    TTFB: ${auditData.ttfb} ms`);
    console.log(`    FCP (First Contentful Paint): ${auditData.fcp} ms`);
    console.log(`    DOM Interactive: ${auditData.domInteractive} ms`);
    console.log(`    DOM Content Loaded: ${auditData.domContentLoaded} ms`);
    console.log(`    Full Page Load Duration: ${fullLoadTime} ms`);

    console.log("\n  DOM & Rendering Pressure:");
    console.log(`    Total DOM Nodes: ${auditData.domNodes}`);
    console.log(`    Total Image Elements in DOM: ${auditData.imagesCount}`);
    console.log(`    Backdrop-Blur Filter Elements: ${auditData.backdropBlurElements}`);
    console.log(`    Horizontal Rails: ${auditData.rails}`);

    console.log("\n  Network Activity:");
    console.log(`    Total Requests: ${totalRequests}`);
    console.log(`    Image Requests: ${imageRequests}`);
    console.log(`    Script Requests: ${scriptRequests}`);
    console.log(`    API Requests: ${apiRequests}`);
    console.log(`    Transferred Bytes: ~${Math.round(totalBytes / 1024)} KB`);

    if (auditData.memory) {
      console.log("\n  Memory Profiling:");
      console.log(`    Used JS Heap: ${auditData.memory.usedJSHeapSize} MB`);
      console.log(`    Total JS Heap: ${auditData.memory.totalJSHeapSize} MB`);
    }

    // Touch Latency Test: Single Tap on Mobile Nav
    console.log("\n[2] Testing Mobile Single-Tap Responsiveness...");
    const navItems = await page.$$("nav[aria-label='Mobile Navigation'] a");
    console.log(`    Found ${navItems.length} MobileNav items.`);

    if (navItems.length > 1) {
      const animeBtn = navItems[3]; // Anime button
      const tapStart = Date.now();
      await animeBtn.tap();
      await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
      const tapDuration = Date.now() - tapStart;
      console.log(`    Tap -> Navigation finished in ${tapDuration} ms (URL: ${page.url()})`);
    }

    // Measure Scroll performance on Mobile
    console.log("\n[3] Testing Vertical Scroll Performance...");
    const scrollStart = Date.now();
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 400));
      await new Promise((r) => setTimeout(r, 80));
    }
    const scrollTime = Date.now() - scrollStart;
    console.log(`    5-step vertical scroll took: ${scrollTime} ms`);

    console.log("\n================================================================");
    console.log("   MOBILE PROFILE COMPLETE                                      ");
    console.log("================================================================");
  } catch (err) {
    console.error("Profile Error:", err);
  } finally {
    await browser.close();
  }
}

profileMobile();
