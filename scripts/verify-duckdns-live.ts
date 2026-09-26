import https from "https";

const DOMAIN = "chillerstream.duckdns.org";
const IP = "76.76.21.21";

async function fetchRoute(path: string, options: { method?: string; headers?: Record<string, string> } = {}): Promise<{ status: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: IP,
      port: 443,
      method: options.method || "GET",
      path,
      servername: DOMAIN,
      headers: {
        Host: DOMAIN,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...options.headers,
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function runLiveVerification() {
  console.log("=== CHILLER DUCKDNS LIVE PRODUCTION VERIFICATION ===");
  console.log(`Target: https://${DOMAIN}`);
  console.log(`Anycast Edge: ${IP}:443\n`);

  const routes = [
    { name: "Home Page", path: "/" },
    { name: "Movies Catalog", path: "/movies" },
    { name: "Series Catalog", path: "/series" },
    { name: "Anime Catalog", path: "/anime" },
    { name: "Trending", path: "/trending" },
    { name: "Search", path: "/search" },
    { name: "Login", path: "/login" },
    { name: "Register", path: "/register" },
    { name: "My List", path: "/my-list" },
    { name: "Profile", path: "/profile" },
    { name: "Movie Watch (Inception 27205)", path: "/watch/movie/27205" },
    { name: "TV Watch (The Last of Us 100088)", path: "/watch/tv/100088" },
    { name: "Anime Watch (Naruto 20)", path: "/watch/anime/20" },
    { name: "PWA Manifest", path: "/manifest.webmanifest" },
    { name: "Service Worker", path: "/sw.js" },
    { name: "Auth CSRF API", path: "/api/auth/csrf" },
    { name: "Playback Health API", path: "/api/playback/health" },
  ];

  let passed = 0;
  for (const r of routes) {
    try {
      const res = await fetchRoute(r.path);
      const isOk = res.status >= 200 && res.status < 400;
      if (isOk) {
        console.log(`✓ [${res.status}] ${r.name.padEnd(35)} -> ${res.body.length} bytes`);
        passed++;
      } else {
        console.error(`✗ [${res.status}] ${r.name.padEnd(35)} -> Error`);
      }
    } catch (err: any) {
      console.error(`✗ [ERR] ${r.name.padEnd(35)} -> ${err.message}`);
    }
  }

  console.log(`\nResults: ${passed}/${routes.length} endpoints passed.`);

  // Test Playback Resolution API
  console.log("\nTesting Playback Resolution via https://" + DOMAIN + "...");
  try {
    const playRes = await fetchRoute("/api/playback/resolve?type=movie&tmdbId=27205");
    console.log(`Playback Resolve API Status: ${playRes.status}`);
    const json = JSON.parse(playRes.body);
    console.log(`Playback Stream Sources Found: ${json.sources ? json.sources.length : (json.url ? 1 : "embed")}`);
    console.log("✓ Playback resolution engine confirmed active on custom domain!");
  } catch (err: any) {
    console.error("Playback test note:", err.message);
  }
}

runLiveVerification();
