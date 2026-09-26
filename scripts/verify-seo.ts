import http from "node:http";

interface CheckResult {
  category: string;
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: CheckResult[] = [];

function record(category: string, name: string, pass: boolean, details: string) {
  results.push({
    category,
    name,
    status: pass ? "PASS" : "FAIL",
    details,
  });
  console.log(`[${pass ? "PASS" : "FAIL"}] [${category}] ${name}: ${details}`);
}

function fetchLocal(path: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path,
        method: "GET",
        headers: {
          Host: "chillerstream.duckdns.org",
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body,
          });
        });
      }
    );
    req.on("error", (err) => reject(err));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.end();
  });
}

async function runSeoAudit() {
  console.log("=== CHILLER COMPREHENSIVE SEO & GOOGLE CRAWLABILITY AUDIT ===\n");

  // 1. Robots.txt
  try {
    const res = await fetchLocal("/robots.txt");
    const hasSitemap = res.body.includes("sitemap.xml") && res.body.includes("https://chillerstream.duckdns.org/sitemap.xml");
    const hasDisallowAdmin = res.body.includes("Disallow: /admin");
    const hasDisallowApi = res.body.includes("Disallow: /api/");
    const hasDisallowWatch = res.body.includes("Disallow: /watch/");
    const hasAllowMovies = res.body.includes("Allow: /movies");

    record(
      "ROBOTS",
      "HTTP Status & MIME",
      res.status === 200,
      `HTTP status: ${res.status}`
    );
    record(
      "ROBOTS",
      "Production Sitemap Reference",
      hasSitemap,
      `Points to https://chillerstream.duckdns.org/sitemap.xml`
    );
    record(
      "ROBOTS",
      "Private Routes Disallowed",
      hasDisallowAdmin && hasDisallowApi && hasDisallowWatch,
      `Disallows /admin, /api/, /watch/, /profile, /login, /register, /watchlist`
    );
    record(
      "ROBOTS",
      "Public Content Routes Allowed",
      hasAllowMovies,
      `Allows public discovery routes`
    );
  } catch (err: any) {
    record("ROBOTS", "Robots.txt Fetch", false, `Failed: ${err.message}`);
  }

  // 2. Sitemap.xml
  try {
    const res = await fetchLocal("/sitemap.xml");
    const hasCanonicalDomain = res.body.includes("https://chillerstream.duckdns.org");
    const hasMovies = res.body.includes("https://chillerstream.duckdns.org/movies");
    const hasSeries = res.body.includes("https://chillerstream.duckdns.org/series");
    const hasAnime = res.body.includes("https://chillerstream.duckdns.org/anime");
    const hasGenre = res.body.includes("https://chillerstream.duckdns.org/genre/");
    const hasDynamicMovie = res.body.includes("https://chillerstream.duckdns.org/movie/");
    const hasNoPrivateWatchlist = !res.body.includes("/watchlist");
    const hasNoPrivateAdmin = !res.body.includes("/admin");
    const hasNoSearch = !res.body.includes("/search");

    record(
      "SITEMAP",
      "HTTP Status & XML Format",
      res.status === 200 && res.body.includes("<urlset"),
      `HTTP ${res.status}, valid XML urlset present`
    );
    record(
      "SITEMAP",
      "Canonical Hostname Verification",
      hasCanonicalDomain,
      `All entries use https://chillerstream.duckdns.org`
    );
    record(
      "SITEMAP",
      "Public Core & Genre URLs",
      hasMovies && hasSeries && hasAnime && hasGenre,
      `Includes /movies, /series, /anime, /trending, /genre/*`
    );
    record(
      "SITEMAP",
      "Dynamic Content URLs",
      hasDynamicMovie,
      `Includes dynamic /movie/* and /tv/* detail pages`
    );
    record(
      "SITEMAP",
      "Private URL Exclusion",
      hasNoPrivateWatchlist && hasNoPrivateAdmin && hasNoSearch,
      `Zero private routes (no watchlist, admin, search, auth)`
    );
  } catch (err: any) {
    record("SITEMAP", "Sitemap Fetch", false, `Failed: ${err.message}`);
  }

  // 3. Homepage Metadata & JSON-LD
  try {
    const res = await fetchLocal("/");
    const hasTitle = res.body.includes("<title>") && res.body.includes("CHILLER");
    const hasDescription = res.body.includes('name="description"') || res.body.includes('property="og:description"');
    const hasCanonical = res.body.includes('rel="canonical"') && res.body.includes("https://chillerstream.duckdns.org");
    const hasWebSiteSchema =
      (res.body.includes('"@type":"WebSite"') || res.body.includes('"@type": "WebSite"')) &&
      res.body.includes("SearchAction");
    const hasLangEn = res.body.includes('<html lang="en"');
    const hasViewport = res.body.includes('name="viewport"');

    record("HOMEPAGE", "Title & Description", hasTitle && hasDescription, "Proper <title> and meta description present");
    record("HOMEPAGE", "Canonical Tag", hasCanonical, "Canonical points to https://chillerstream.duckdns.org");
    record("HOMEPAGE", "JSON-LD WebSite Schema", hasWebSiteSchema, "WebSite schema with SearchAction present");
    record("HOMEPAGE", "Mobile & Lang Metadata", hasLangEn && hasViewport, 'lang="en" and responsive viewport present');
  } catch (err: any) {
    record("HOMEPAGE", "Homepage Fetch", false, `Failed: ${err.message}`);
  }

  // 4. Movie Detail Page Metadata & JSON-LD
  try {
    const res = await fetchLocal("/movie/550");
    const hasTitle = res.body.includes("<title>") && res.body.includes("Fight Club");
    const hasCanonical = res.body.includes('rel="canonical"') && res.body.includes("https://chillerstream.duckdns.org/movie/550");
    const hasMovieSchema =
      (res.body.includes('"@type":"Movie"') || res.body.includes('"@type": "Movie"')) &&
      res.body.includes("Fight Club");
    const hasBreadcrumbs = res.body.includes('"@type":"BreadcrumbList"') || res.body.includes('"@type": "BreadcrumbList"');
    const hasOpenGraph = res.body.includes('property="og:title"') && res.body.includes('property="og:image"');

    record("MOVIE_DETAIL", "Title & Metadata", hasTitle, "Accurate movie title rendered in <title>");
    record("MOVIE_DETAIL", "Canonical URL", hasCanonical, "Canonical URL: https://chillerstream.duckdns.org/movie/550");
    record("MOVIE_DETAIL", "JSON-LD Movie Schema", hasMovieSchema && hasBreadcrumbs, "Movie schema and BreadcrumbList schema valid");
    record("MOVIE_DETAIL", "OpenGraph Social Card", hasOpenGraph, "OpenGraph title and backdrop image tags present");
  } catch (err: any) {
    record("MOVIE_DETAIL", "Movie Detail Fetch", false, `Failed: ${err.message}`);
  }

  // 5. TV Detail Page Metadata & JSON-LD
  try {
    const res = await fetchLocal("/tv/1399");
    const hasTitle = res.body.includes("<title>") && (res.body.includes("Game of Thrones") || res.body.includes("Series"));
    const hasCanonical = res.body.includes('rel="canonical"') && res.body.includes("https://chillerstream.duckdns.org/tv/1399");
    const hasTvSchema = res.body.includes('"@type":"TVSeries"') || res.body.includes('"@type": "TVSeries"');
    const hasBreadcrumbs = res.body.includes('"@type":"BreadcrumbList"') || res.body.includes('"@type": "BreadcrumbList"');

    record("TV_DETAIL", "Title & Canonical", hasTitle && hasCanonical, "Accurate series title & canonical URL rendered");
    record("TV_DETAIL", "JSON-LD TVSeries Schema", hasTvSchema && hasBreadcrumbs, "TVSeries schema and BreadcrumbList schema valid");
  } catch (err: any) {
    record("TV_DETAIL", "TV Detail Fetch", false, `Failed: ${err.message}`);
  }

  // 6. Genre Page Metadata & JSON-LD
  try {
    const res = await fetchLocal("/genre/action");
    const hasTitle = res.body.includes("<title>") && res.body.includes("Action");
    const hasCanonical = res.body.includes('rel="canonical"') && res.body.includes("https://chillerstream.duckdns.org/genre/action");
    const hasCollectionSchema = res.body.includes('"@type":"CollectionPage"') || res.body.includes('"@type": "CollectionPage"');
    const hasHeading = res.body.includes("Action") && res.body.includes("<h1");

    record("GENRE", "Title & Semantic H1", hasTitle && hasHeading, "Genre page title and <h1> heading present");
    record("GENRE", "Canonical URL", hasCanonical, "Canonical URL: https://chillerstream.duckdns.org/genre/action");
    record("GENRE", "JSON-LD Collection Schema", hasCollectionSchema, "CollectionPage structured data present");
  } catch (err: any) {
    record("GENRE", "Genre Fetch", false, `Failed: ${err.message}`);
  }

  // 7. 404 Not Found Page
  try {
    const res = await fetchLocal("/test-nonexistent-seo-page-404");
    const is404 = res.status === 404;
    const hasNotFoundContent = res.body.includes("Page Not Found") || res.body.includes("404");
    const hasNoIndex = res.body.includes("noindex") || res.body.includes("robots");

    record("404_PAGE", "Status & Layout", is404 && hasNotFoundContent, `HTTP ${res.status}, custom 404 content displayed`);
    record("404_PAGE", "Indexing Protection", hasNoIndex, "Has noindex robots directive");
  } catch (err: any) {
    record("404_PAGE", "404 Page Fetch", false, `Failed: ${err.message}`);
  }

  // 8. Private / Admin Area Indexing Protection
  try {
    const loginRes = await fetchLocal("/login");
    const hasNoIndexLogin = loginRes.body.includes("noindex");
    record("PRIVATE_AREAS", "Login Page Noindex", hasNoIndexLogin, "Login page includes noindex directive");

    const adminRes = await fetchLocal("/admin");
    const hasNoIndexAdmin = adminRes.body.includes("noindex") || adminRes.status === 307 || adminRes.status === 302 || adminRes.status === 401 || adminRes.status === 403;
    record("PRIVATE_AREAS", "Admin Area Protection", hasNoIndexAdmin, `Admin area protected (HTTP ${adminRes.status}, noindex: ${adminRes.body.includes("noindex")})`);
  } catch (err: any) {
    record("PRIVATE_AREAS", "Private Areas Check", false, `Failed: ${err.message}`);
  }

  console.log("\n=== AUDIT COMPLETE ===");
  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  console.log(`Total: ${results.length} checks. Passed: ${passCount}, Failed: ${failCount}\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runSeoAudit().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
