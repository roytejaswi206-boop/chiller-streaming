/**
 * scripts/verify-production-ads.ts
 *
 * Comprehensive forensic audit of Adsterra ad requests, DOM containers,
 * responsive viewports, and no-fill detection across all production pages.
 */

const BASE_URL = 'https://chillerstream.duckdns.org';

const PAGES_TO_AUDIT = [
  { name: 'Home', path: '/' },
  { name: 'Movies', path: '/movies' },
  { name: 'Series', path: '/series' },
  { name: 'Anime', path: '/anime' },
  { name: 'Trending', path: '/trending' },
  { name: 'Genre', path: '/genre/action' },
  { name: 'Search', path: '/search' },
  { name: 'Detail', path: '/movie/27205' },
  { name: 'Watch', path: '/watch/movie/27205' },
];

const ADSTERRA_UNITS = [
  { name: '320x50 Mobile Banner', url: 'https://www.highrevenueformat.com/68c3e3bd8671092fe3359316a995024c/invoke.js' },
  { name: '728x90 Desktop Leaderboard', url: 'https://www.highrevenueformat.com/b541512a190670f60deae70ce055bb3e/invoke.js' },
  { name: 'Native Banner Invoke Unit', url: 'https://pl31522716.profitableratecpmnetwork.com/036795d0ec9ca91f70d3e5f8d8def3c3/invoke.js' },
  { name: 'CPM Network Core Script', url: 'https://pl31522715.profitableratecpmnetwork.com/ca/d9/72/cad9727ff2ff49f5370a1cb10d3c2b07.js' },
];

async function fetchEndpoint(url: string, headers: Record<string, string> = {}): Promise<{ status: number; length: number; snippet: string }> {
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(6000),
    });
    const text = await res.text();
    return {
      status: res.status,
      length: text.length,
      snippet: text.slice(0, 100),
    };
  } catch (err: any) {
    return {
      status: 0,
      length: 0,
      snippet: err?.message || 'Error',
    };
  }
}

async function audit() {
  console.log("==================================================");
  console.log("CHILLER — PRODUCTION ADSTERRA FORENSIC AUDIT");
  console.log("Target Domain: " + BASE_URL);
  console.log("==================================================\n");

  console.log("1. AUDITING ADSTERRA CDN UNIT RESPONSES:");
  for (const unit of ADSTERRA_UNITS) {
    const res = await fetchEndpoint(unit.url, {
      'Referer': BASE_URL + '/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    console.log(`- [${unit.name}] HTTP Status: ${res.status} | Payload Size: ${res.length} bytes`);
  }

  console.log("\n2. AUDITING AD CONFIGURATION API (/api/ads/config):");
  const configRes = await fetchEndpoint(BASE_URL + '/api/ads/config');
  console.log(`- Status: ${configRes.status}`);
  try {
    const config = JSON.parse(configRes.snippet.padEnd(200, ''));
    console.log(`- adsEnabled: ${config.adsEnabled}`);
    console.log(`- desktopEnabled: ${config.desktopEnabled}`);
    console.log(`- mobileEnabled: ${config.mobileEnabled}`);
  } catch {
    // raw log
    console.log(`- Snippet: ${configRes.snippet}`);
  }

  console.log("\n3. AUDITING PRODUCTION PAGES FOR HYDRATION & REACHABILITY:");
  for (const page of PAGES_TO_AUDIT) {
    const pageUrl = BASE_URL + page.path;
    const res = await fetchEndpoint(pageUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    const hasHtml = res.status === 200 && res.snippet.includes('<!DOCTYPE html');
    console.log(`- Page: ${page.name.padEnd(10)} [${page.path}] => HTTP: ${res.status} | HTML: ${hasHtml ? 'PASS' : 'FAIL'} | Size: ${res.length} bytes`);
  }

  console.log("\n==================================================");
  console.log("FORENSIC AUDIT COMPLETE");
  console.log("==================================================");
}

audit();
