/**
 * scripts/test-ad-system.ts
 *
 * Automated Verification Suite for CHILLER Premium Ad Monetization System
 */

(process.env as any).NODE_ENV = "test";

import { evaluateAdEligibility, recordProviderFailure, isProviderAvailable } from "../lib/ads/ad-manager";
import { isUserAdsFree, isRouteExcluded } from "../lib/ads/ad-exclusions";
import { checkFrequencyEligibility, getAdSessionState, saveAdSessionState } from "../lib/ads/ad-frequency";
import { DEFAULT_AD_SETTINGS } from "../lib/ads/config";

async function runAdSystemTests() {
  console.log("==================================================");
  console.log("CHILLER AD MONETIZATION SYSTEM — VERIFICATION SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details || "Assertion failed"}`);
      failed++;
    }
  }

  // 1. Super Admin Auto-Exemption Test
  console.log("\n--- TEST GROUP 1: Ad-Free Accounts & Super Admins ---");
  const superAdminUser1 = { email: "roytejaswi40@gmail.com", role: "SUPER_ADMIN" };
  const superAdminUser2 = { email: "roytejaswi206@gmail.com", role: "USER" }; // Email match triggers exemption
  const regularUserWithFlag = { email: "friend@example.com", role: "USER", adsFree: true };
  const standardUser = { email: "regular@example.com", role: "USER", adsFree: false };
  const guestUser = null;

  assert("Super Admin 1 (roytejaswi40@gmail.com) is ad-free", isUserAdsFree(superAdminUser1));
  assert("Super Admin 2 (roytejaswi206@gmail.com) is ad-free via email match", isUserAdsFree(superAdminUser2));
  assert("Friend account with adsFree=true is ad-free", isUserAdsFree(regularUserWithFlag));
  assert("Standard user with adsFree=false is NOT ad-free", !isUserAdsFree(standardUser));
  assert("Guest user is NOT ad-free", !isUserAdsFree(guestUser));

  // 2. Route Exclusions Test
  console.log("\n--- TEST GROUP 2: Route Exclusions ---");
  assert("/admin routes are excluded from ads", isRouteExcluded("/admin"));
  assert("/admin/ads is excluded from ads", isRouteExcluded("/admin/ads"));
  assert("/login is excluded from ads", isRouteExcluded("/login"));
  assert("/register is excluded from ads", isRouteExcluded("/register"));
  assert("/profile is excluded from ads", isRouteExcluded("/profile"));
  assert("/settings is excluded from ads", isRouteExcluded("/settings"));
  assert("/ (Home) is NOT excluded from ads", !isRouteExcluded("/"));
  assert("/movies is NOT excluded from ads", !isRouteExcluded("/movies"));
  assert("/watch/movie/27205 is NOT excluded from ads", !isRouteExcluded("/watch/movie/27205"));

  // 3. Global Kill Switch Test
  console.log("\n--- TEST GROUP 3: Global Kill Switch ---");
  const settingsWithKillSwitch = { ...DEFAULT_AD_SETTINGS, adsEnabled: false };
  const killSwitchEval = evaluateAdEligibility("home_top", "/", standardUser, false, settingsWithKillSwitch);
  assert("Kill switch disabled blocks ad display", !killSwitchEval.eligible);
  assert("Kill switch reason is clear", killSwitchEval.reason.includes("Global ads switch is disabled"));

  // 4. Device Format Selection Test
  console.log("\n--- TEST GROUP 4: Responsive Device Format Selection ---");
  const desktopEval = evaluateAdEligibility("home_top", "/", standardUser, false, { ...DEFAULT_AD_SETTINGS, initialPageAdDelay: 0 });
  const mobileEval = evaluateAdEligibility("home_top", "/", standardUser, true, { ...DEFAULT_AD_SETTINGS, initialPageAdDelay: 0 });

  assert("Desktop selects 728x90 format", desktopEval.format === "728x90" && desktopEval.provider === "highrevenue_728x90");
  assert("Mobile selects 320x50 format", mobileEval.format === "320x50" && mobileEval.provider === "highrevenue_320x50");

  // 5. Device-level disable switches
  console.log("\n--- TEST GROUP 5: Device-level Disabling ---");
  const noMobileSettings = { ...DEFAULT_AD_SETTINGS, mobileEnabled: false, initialPageAdDelay: 0 };
  const noMobileEval = evaluateAdEligibility("home_top", "/", standardUser, true, noMobileSettings);
  assert("Disabling mobile ads blocks mobile slot", !noMobileEval.eligible && noMobileEval.reason.includes("Mobile ads disabled"));

  const noDesktopSettings = { ...DEFAULT_AD_SETTINGS, desktopEnabled: false, initialPageAdDelay: 0 };
  const noDesktopEval = evaluateAdEligibility("home_top", "/", standardUser, false, noDesktopSettings);
  assert("Disabling desktop ads blocks desktop slot", !noDesktopEval.eligible && noDesktopEval.reason.includes("Desktop ads disabled"));

  // 6. Section & Page Disabling
  console.log("\n--- TEST GROUP 6: Page-Specific Disabling ---");
  const noWatchAdsSettings = { ...DEFAULT_AD_SETTINGS, watchEnabled: false, initialPageAdDelay: 0 };
  const watchEval = evaluateAdEligibility("player_below", "/watch/movie/27205", standardUser, false, noWatchAdsSettings);
  assert("Disabling watch page ads suppresses player_below ad", !watchEval.eligible && watchEval.reason.includes("Watch page ads disabled"));

  // 7. Provider Circuit Breaker
  console.log("\n--- TEST GROUP 7: Provider Circuit Breaker ---");
  assert("Provider highrevenue_728x90 initially available", isProviderAvailable("highrevenue_728x90"));
  recordProviderFailure("highrevenue_728x90");
  recordProviderFailure("highrevenue_728x90"); // Threshold 2
  assert("Provider enters circuit-breaker cooldown after 2 failures", !isProviderAvailable("highrevenue_728x90"));

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdSystemTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
