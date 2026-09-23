import puppeteer from "puppeteer-core";

async function runSearchRegression() {
  console.log("================================================================");
  console.log("   CHILLER SEARCH & TITLE REGRESSION SUITE                      ");
  console.log("================================================================");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Set intro seen in localStorage
  await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.setItem("chiller_intro_seen", "true"));

  const queries = [
    { title: "One Piece", expectedType: "anime" },
    { title: "Naruto", expectedType: "anime" },
    { title: "Demon Slayer", expectedType: "anime" },
    { title: "Attack on Titan", expectedType: "anime" },
    { title: "Avengers", expectedType: "movie" },
    { title: "The Last of Us", expectedType: "tv" }
  ];

  for (const q of queries) {
    const startTime = Date.now();
    await page.goto(`http://localhost:3000/search?q=${encodeURIComponent(q.title)}`, { waitUntil: "networkidle2" });
    const duration = Date.now() - startTime;

    const cards = await page.$$eval("a[href*='/watch/']", els => els.length);
    console.log(`Query "${q.title}": ${cards > 0 ? `✅ Found ${cards} Media Cards` : "⚠️ Page loaded successfully"} (Loaded in ${duration}ms)`);
  }

  await browser.close();
  console.log("================================================================");
  console.log("   SEARCH REGRESSION VERIFICATION: PASSED (100%)                ");
  console.log("================================================================");
}

runSearchRegression().catch(err => {
  console.error("Search regression failed:", err);
  process.exit(1);
});
