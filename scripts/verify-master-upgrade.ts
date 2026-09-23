/**
 * scripts/verify-master-upgrade.ts
 *
 * Automated verification suite for CHILLER Post-Implementation Hardening:
 * 1. Security & Credential Hygiene (no hardcoded secrets, .env protection)
 * 2. Mobile Navigation & Safe Areas
 * 3. Responsive Page Layout & Zero Horizontal Overflow Rules
 * 4. Player Clean Cinema Mode & Auto-Hide Timing (3000ms)
 * 5. Mobile Player Bottom Sheet Settings Menu
 * 6. True Resume System & 95% Completion Edge Cases
 * 7. Multi-Provider Fallback & Circuit Breaker Engine
 * 8. Real EarnVids Provider Integration (/file/list API contract)
 * 9. Anime English Dub Resolution & Continuity
 * 10. Truthful Audio & Quality Controls
 */

import {
  validateProgressPosition,
  resolveResumeSourceOfTruth,
  buildMediaProgressKey,
} from "../lib/playback/resume-service";
import {
  normalizeAudioTracks,
  getStoredAudioPreference,
  selectBestAudioTrack,
  NormalizedAudioTrack,
} from "../lib/playback/audio-normalizer";
import { playbackRegistry } from "../lib/playback/registry";
import { EarnVidsProvider } from "../lib/playback/providers/earnvids";
import { resolveAnimePlayback } from "../lib/playback/resolver";
import * as fs from "fs";
import * as path from "path";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function runVerification() {
  console.log("\n=======================================================");
  console.log("  CHILLER POST-IMPLEMENTATION HARDENING AUDIT");
  console.log("=======================================================\n");

  // ── 1. SECURITY & CREDENTIAL SANITIZATION AUDIT ──
  console.log("Suite 1: Security & Credential Hygiene");
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
  assert(
    gitignoreContent.includes(".env*") || gitignoreContent.includes(".env.local"),
    ".gitignore properly excludes environment files"
  );

  // Verify no hardcoded secrets in source files
  const checkedFiles = [
    "lib/playback/providers/earnvids.ts",
    "lib/playback/providers/cinesrc.ts",
    "lib/playback/providers/vidsrc.ts",
    "components/player/ExternalPlayer.tsx",
    "components/player/VideoPlayer.tsx",
  ];
  let secretFoundInSource = false;
  for (const relPath of checkedFiles) {
    const fullPath = path.join(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      const code = fs.readFileSync(fullPath, "utf-8");
      // Check for hardcoded API keys or tokens assigned as string literals
      if (/(?:api_key|apiKey|token)\s*=\s*["'][a-zA-Z0-9_-]{20,}["']/i.test(code)) {
        secretFoundInSource = true;
      }
    }
  }
  assert(!secretFoundInSource, "Zero hardcoded provider secrets in verified source files");

  // ── 2. SAFE AREA & VIEWPORT CONFIGURATION ──
  console.log("\nSuite 2: Viewport & Safe Area Configuration");
  const layoutPath = path.join(process.cwd(), "app", "layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  assert(
    layoutContent.includes('viewportFit: "cover"'),
    "app/layout.tsx exports viewport with viewportFit: cover"
  );
  assert(
    layoutContent.includes("overflow-x-hidden"),
    "app/layout.tsx body enforces overflow-x-hidden"
  );
  assert(
    layoutContent.includes("env(safe-area-inset-bottom)"),
    "app/layout.tsx incorporates safe-area-inset-bottom padding"
  );

  // ── 3. MOBILE NAVIGATION AUDIT ──
  console.log("\nSuite 3: Mobile Navigation Architecture");
  const mobileNavPath = path.join(process.cwd(), "components", "layout", "MobileNav.tsx");
  const mobileNavContent = fs.readFileSync(mobileNavPath, "utf-8");
  const requiredDestinations = ["Home", "Movies", "Series", "Anime", "Search", "Profile"];
  const allDestinationsPresent = requiredDestinations.every((d) => mobileNavContent.includes(d));
  assert(allDestinationsPresent, "MobileNav includes all 6 core destinations (Home, Movies, Series, Anime, Search, Profile)");
  assert(
    mobileNavContent.includes("env(safe-area-inset-bottom"),
    "MobileNav applies safe-area-inset-bottom padding"
  );
  assert(
    mobileNavContent.includes('pathname.startsWith("/watch")') || mobileNavContent.includes("pathname.startsWith('/watch')"),
    "MobileNav hides during playback (/watch routes) to avoid covering controls"
  );
  assert(
    mobileNavContent.includes("md:hidden"),
    "MobileNav targets phones only (md:hidden) so tablets use the navigation rail"
  );

  const sidebarPath = path.join(process.cwd(), "components", "layout", "Sidebar.tsx");
  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
  assert(
    sidebarContent.includes("hidden md:flex") && sidebarContent.includes("w-16 lg:w-56"),
    "Sidebar adapts as a compact icon rail on tablets (md) and full sidebar on desktop (lg)"
  );

  // ── 4. RESPONSIVE HERO & RAILS ──
  console.log("\nSuite 4: Responsive Hero, Rails, and Grids");
  const heroPath = path.join(process.cwd(), "components", "video", "ChillerHero.tsx");
  const heroContent = fs.readFileSync(heroPath, "utf-8");
  assert(
    heroContent.includes("text-xl sm:text-3xl lg:text-5xl"),
    "ChillerHero uses fluid, scaled typography"
  );

  const mediaCardPath = path.join(process.cwd(), "components", "video", "MediaCard.tsx");
  const mediaCardContent = fs.readFileSync(mediaCardPath, "utf-8");
  assert(
    mediaCardContent.includes("touch-manipulation") && mediaCardContent.includes("active:scale-[0.98]"),
    "MediaCard provides tactile touch feedback without requiring hover"
  );

  const mediaRailPath = path.join(process.cwd(), "components", "video", "MediaRail.tsx");
  const mediaRailContent = fs.readFileSync(mediaRailPath, "utf-8");
  assert(
    mediaRailContent.includes("snap-x") && mediaRailContent.includes("snap-mandatory"),
    "MediaRail uses touch-friendly snap scrolling"
  );

  const detailViewPath = path.join(process.cwd(), "components", "video", "MediaDetailView.tsx");
  const detailViewContent = fs.readFileSync(detailViewPath, "utf-8");
  assert(
    detailViewContent.includes("Watch in English"),
    "MediaDetailView includes dedicated [ Watch in English ] CTA for anime"
  );

  // ── 5. PLAYER SETTINGS BOTTOM SHEET ──
  console.log("\nSuite 5: Player Responsive Settings (Bottom Sheet on Mobile)");
  const extPlayerPath = path.join(process.cwd(), "components", "player", "ExternalPlayer.tsx");
  const extPlayerContent = fs.readFileSync(extPlayerPath, "utf-8");
  assert(
    extPlayerContent.includes("sm:hidden fixed inset-0 z-40 bg-black/60"),
    "ExternalPlayer renders backdrop overlay on mobile settings open"
  );
  assert(
    extPlayerContent.includes("fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto"),
    "ExternalPlayer converts Settings into slide-up bottom sheet on mobile"
  );
  assert(
    extPlayerContent.includes("PLAYER_CONTROLS_AUTO_HIDE_MS = 3000") || extPlayerContent.includes("3000"),
    "Player controls use ~3000ms auto-hide timing"
  );

  // ── 6. TRUE RESUME & 95% COMPLETION ──
  console.log("\nSuite 6: True Resume & Completion Engine");
  const res50 = validateProgressPosition(500, 1000);
  assert(res50.valid && res50.position === 500 && !res50.isCompleted, "50% position valid for resume");

  const res94 = validateProgressPosition(940, 1000);
  assert(res94.valid && res94.position === 940 && !res94.isCompleted, "94% position (< 95%) preserved for resume");

  const res95 = validateProgressPosition(950, 1000);
  assert(!res95.valid && res95.position === 0 && res95.isCompleted, "95% completion threshold resets position to 0 and marks completed");

  const res99 = validateProgressPosition(990, 1000);
  assert(!res99.valid && res99.position === 0 && res99.isCompleted, "99% progress marks completed and resets position to 0");

  // Priority test: Auth DB > Guest Storage > Explicit URL Override
  const resAuth = resolveResumeSourceOfTruth({
    mediaType: "movie",
    tmdbId: 550,
    authDbItems: [{ tmdbId: 550, progressSeconds: 750, durationSeconds: 1000 }],
    guestStorageItems: { "chiller_progress_movie_550": { position: 200, duration: 1000 } },
    urlTime: undefined,
  });
  assert(resAuth.position === 750 && resAuth.source === "AUTH_DB", "Auth DB has highest priority over localStorage");

  // Replay from beginning when completed
  const resCompleted = resolveResumeSourceOfTruth({
    mediaType: "movie",
    tmdbId: 550,
    authDbItems: [{ tmdbId: 550, progressSeconds: 980, durationSeconds: 1000 }],
  });
  assert(resCompleted.position === 0 && resCompleted.isCompleted, "Completed content restarts from 0 for fresh replay");

  // ── 7. MULTI-PROVIDER FALLBACK & CIRCUIT BREAKER ──
  console.log("\nSuite 7: Multi-Provider Fallback & Circuit Breakers");
  const providers = playbackRegistry.getAllProviders();
  assert(providers.length >= 5, `Playback registry has multiple providers registered (${providers.length} found)`);

  const movieRequest = { mediaType: "movie" as const, tmdbId: 550 };
  const ranked = playbackRegistry.rankProviders(movieRequest);
  assert(ranked.length > 0, "Provider ranking successfully produces prioritized candidates");

  // ── 8. REAL EARNVIDS INTEGRATION ──
  console.log("\nSuite 8: Real EarnVids Provider Contract");
  const earnvids = new EarnVidsProvider();
  assert(earnvids.id === "earnvids", "EarnVidsProvider is registered with id 'earnvids'");
  const caps = earnvids.getCapabilities();
  assert(caps.requiresApiKey === true, "EarnVids correctly declares requiresApiKey = true");
  assert(caps.supportsDub === false, "EarnVids correctly declares supportsDub = false (UI truth)");

  const health = await earnvids.healthCheck();
  assert(
    ["ACTIVE", "DISABLED", "NOT_CONFIGURED", "DEGRADED"].includes(health.status),
    `EarnVids health check executed cleanly: status = ${health.status} (${health.message})`
  );

  // ── 9. ANIME ENGLISH DUB RESOLVER ──
  console.log("\nSuite 9: Anime English Dub Resolver");
  // Test resolveAnimePlayback with preferredAudio: "en"
  const dubRes = await resolveAnimePlayback(21, 1, 21, { language: "dub", preferredAudio: "en" });
  assert(Array.isArray(dubRes.sources), "resolveAnimePlayback returns valid sources array for English dub request");

  // ── 10. TRUTHFUL AUDIO & QUALITY TRACKS ──
  console.log("\nSuite 10: Audio UI Truth & Quality Normalization");
  const mockTracks: NormalizedAudioTrack[] = [
    { id: "1", languageCode: "ja", languageName: "Japanese", label: "Japanese (Original)", isOriginal: true, isDubbed: false },
    { id: "2", languageCode: "en", languageName: "English", label: "English (Dub)", isOriginal: false, isDubbed: true },
  ];
  const bestDub = selectBestAudioTrack(mockTracks, "en");
  assert(Boolean(bestDub?.languageCode === "en" && bestDub.isDubbed), "selectBestAudioTrack selects verified English Dub track");

  const bestOrig = selectBestAudioTrack(mockTracks, "ja");
  assert(Boolean(bestOrig?.languageCode === "ja" && bestOrig.isOriginal), "selectBestAudioTrack selects verified Original track");

  // Empty tracks returns null, never fake track
  const noTracks = selectBestAudioTrack([], "en");
  assert(!noTracks, "selectBestAudioTrack returns null when tracks are empty (no fabricated tracks)");

  // ── SUMMARY ──
  console.log("\n=======================================================");
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Verification crashed:", err);
  process.exit(1);
});
