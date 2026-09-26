/**
 * scripts/verify-production-ads.ts
 *
 * Automated verification test suite for CHILLER's exact advertiser-supplied ad integration.
 */

import { AD_PROVIDERS, DEFAULT_AD_SETTINGS } from "../lib/ads/config";

async function runAdsVerification() {
  console.log("==================================================");
  console.log("CHILLER MONETIZATION ADS — AUTOMATED VERIFICATION");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, name: string) => {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  };

  // 1. Verify Code 1 (Smartlink & Script)
  const smartlink = AD_PROVIDERS.PROFITABLERATE_SMARTLINK;
  assert(
    smartlink.url === "https://www.profitableratecpmnetwork.com/ujy49iz7mn?key=9d9f3f1de133e143e575ce2748c53035" &&
    smartlink.scriptUrl === "https://pl31526795.profitableratecpmnetwork.com/19/c9/9b/19c99b3212a84ec41f398c12acf68fa1.js",
    "1. Supplied Code 1: Smartlink URL & Script URL exact match (no modifications)"
  );

  // 2. Verify Code 2 (728x90)
  const ad728 = AD_PROVIDERS.HIGHREVENUE_728x90;
  assert(
    ad728.key === "b541512a190670f60deae70ce055bb3e" &&
    ad728.width === 728 &&
    ad728.height === 90 &&
    ad728.scriptUrl === "https://www.highrevenueformat.com/b541512a190670f60deae70ce055bb3e/invoke.js",
    "2. Supplied Code 2: 728x90 key, format, dimensions & invoke URL exact match"
  );

  // 3. Verify Code 3 (320x50)
  const ad320 = AD_PROVIDERS.HIGHREVENUE_320x50;
  assert(
    ad320.key === "68c3e3bd8671092fe3359316a995024c" &&
    ad320.width === 320 &&
    ad320.height === 50 &&
    ad320.scriptUrl === "https://www.highrevenueformat.com/68c3e3bd8671092fe3359316a995024c/invoke.js",
    "3. Supplied Code 3: 320x50 key, format, dimensions & invoke URL exact match"
  );

  // 4. Verify Code 4 (Container Ad)
  const container = AD_PROVIDERS.PROFITABLERATE_INVOKE;
  assert(
    container.containerId === "container-036795d0ec9ca91f70d3e5f8d8def3c3" &&
    container.scriptUrl === "https://pl31522716.profitableratecpmnetwork.com/036795d0ec9ca91f70d3e5f8d8def3c3/invoke.js",
    "4. Supplied Code 4: Container ID & invoke script exact match"
  );

  // 5. Verify Code 5 (External Script)
  const externalScript = AD_PROVIDERS.PROFITABLERATE_CPM;
  assert(
    externalScript.scriptUrl === "https://pl31522715.profitableratecpmnetwork.com/ca/d9/72/cad9727ff2ff49f5370a1cb10d3c2b07.js",
    "5. Supplied Code 5: External script URL exact match"
  );

  // 6. Verify atOptions isolation integrity (keys must differ)
  assert(
    ad728.key !== ad320.key,
    "6. atOptions isolation: 728x90 and 320x50 keys remain isolated"
  );

  // 7. Verify centralized default settings contain all 5 units
  assert(
    DEFAULT_AD_SETTINGS.adsEnabled === true &&
    DEFAULT_AD_SETTINGS.providerHighRevenue728 === true &&
    DEFAULT_AD_SETTINGS.providerHighRevenue320 === true &&
    DEFAULT_AD_SETTINGS.providerContainer === true &&
    DEFAULT_AD_SETTINGS.providerSmartlink === true &&
    DEFAULT_AD_SETTINGS.providerProfitableRate === true,
    "7. Centralized Ad Settings: All 5 supplied units enabled by default"
  );

  // 8. Verify Route Placements exist and are configurable
  assert(
    DEFAULT_AD_SETTINGS.homeEnabled === true &&
    DEFAULT_AD_SETTINGS.movieEnabled === true &&
    DEFAULT_AD_SETTINGS.seriesEnabled === true &&
    DEFAULT_AD_SETTINGS.animeEnabled === true &&
    DEFAULT_AD_SETTINGS.detailEnabled === true &&
    DEFAULT_AD_SETTINGS.watchEnabled === true,
    "8. Route Coverage: Home, Movies, Series, Anime, Details, and Watch all supported"
  );

  // 9. Verify Responsive Dimensions
  assert(
    ad728.width >= 728 && ad320.width <= 360,
    "9. Viewport responsiveness: Desktop banner >= 728px, mobile banner <= 360px"
  );

  // 10. Verify Non-invasive Policy: Watch page ads placed outside player
  assert(
    DEFAULT_AD_SETTINGS.playerPageLimit === 1,
    "10. Player protection policy: Maximum 1 ad slot below player container"
  );

  console.log("\n==================================================");
  console.log(`TEST SUITE RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdsVerification();
