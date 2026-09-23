/**
 * scripts/verify-production-recovery.ts
 *
 * Comprehensive Autonomous Verification Suite for Production Recovery
 * Tests:
 * 1. Canonical Media Identity & Abbreviation Matching
 * 2. Multi-source Anime Metadata Fabric
 * 3. Unified Search Provider Fan-out
 * 4. Dual Pool Strict Isolation & No-Pollution Rule
 * 5. Anime Episode Engine & Auto-Next Boundary
 * 6. Intelligence Telemetry & Scoring
 */

import { resolveCanonicalIdentity } from "../lib/media/identity/resolver";
import { lookupCrosswalk, registerCrosswalk } from "../lib/media/identity/id-mapper";
import { normalizeTitle, calculateTitleSimilarity, expandAbbreviations } from "../lib/media/identity/title-matcher";
import { animeMetadataFabric } from "../lib/media/anime/metadata-fabric";
import { unifiedSearch } from "../lib/media/search/unified-search";
import { playbackRegistry } from "../lib/playback/registry";
import { resolveAnimePlayback } from "../lib/playback/anime/anime-resolver";
import { resolveNextCanonicalEpisode } from "../lib/playback/anime/episode-mapper";
import { providerHealthCache } from "../lib/playback/health-cache";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ""}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name}${detail ? ` (${detail})` : ""}`);
    failed++;
  }
}

async function runSuite() {
  console.log("================================================================");
  console.log("   CHILLER PRODUCTION RECOVERY & AUTONOMOUS COMPLETION SUITE    ");
  console.log("================================================================\n");

  // ── 1. Canonical Media Identity & Abbreviation Matching ──
  console.log("📦 1. Testing Canonical Media Identity & Abbreviation Matching...");
  const aotExpanded = expandAbbreviations("aot");
  assert(aotExpanded.includes("Attack on Titan"), "Abbreviation expansion for 'aot'", aotExpanded.join(", "));

  const bnhaExpanded = expandAbbreviations("bnha");
  assert(bnhaExpanded.includes("My Hero Academia"), "Abbreviation expansion for 'bnha'", bnhaExpanded.join(", "));

  const jjkExpanded = expandAbbreviations("jjk");
  assert(jjkExpanded.includes("Jujutsu Kaisen"), "Abbreviation expansion for 'jjk'", jjkExpanded.join(", "));

  const opSimilarity = calculateTitleSimilarity("One Piece", "ONE PIECE (TV)");
  assert(opSimilarity > 0.7, "Title similarity matching for One Piece", `similarity=${opSimilarity.toFixed(2)}`);

  const identity = resolveCanonicalIdentity({
    mediaType: "anime",
    anilistId: 16498,
    malId: 16498,
    title: "Shingeki no Kyojin",
    englishTitle: "Attack on Titan",
  });
  assert(identity.ids.anilistId === 16498, "Canonical identity retains AniList ID", `id=${identity.chillerId}`);
  assert(identity.titles.englishTitle === "Attack on Titan", "Canonical identity retains English title");

  // ── 2. Multi-Source Anime Metadata Fabric ──
  console.log("\n⛩️ 2. Testing Anime Metadata Fabric Multi-Source Fallback...");
  try {
    const anime = await animeMetadataFabric.getAnime({ anilistId: 16498 });
    assert(Boolean(anime), "Anime metadata retrieved from fabric", `title=${anime?.title}`);
    assert(Boolean(anime?.identity?.ids?.anilistId === 16498), "Fabric returns canonical identity with AniList ID");
  } catch (err: any) {
    assert(false, "Anime metadata fabric lookup threw error", err.message);
  }

  // ── 3. Unified Search Provider Fan-out ──
  console.log("\n🔍 3. Testing Unified Search Engine...");
  try {
    const searchResults = await unifiedSearch.search("Attack on Titan", { limit: 5 });
    assert(searchResults.length > 0, "Search returned results for Attack on Titan", `count=${searchResults.length}`);
    const topResult = searchResults[0];
    assert(Boolean(topResult.title), "Top search result has valid title", topResult.title);
    assert(topResult.mediaType === "anime", "Top search result has correct mediaType='anime'", topResult.mediaType);
    assert(topResult.watchUrl.startsWith("/watch/anime/"), "Search result produces canonical anime watch URL", topResult.watchUrl);
  } catch (err: any) {
    assert(false, "Unified search failed", err.message);
  }

  // ── 4. Dual Pool Strict Isolation & No-Pollution Rule ──
  console.log("\n🔒 4. Testing Dual-Pool Hard Isolation & Zero Code Path Leakage...");
  const allProviders = playbackRegistry.getAllProviders();
  const animePool = playbackRegistry.getAnimeProviders();
  const generalPool = playbackRegistry.getGeneralProviders();

  // Rule 9: General Pool must NOT have anime-only providers
  const generalHasAnimeOnly = generalPool.some((p) => p.id === "nhd-anime");
  assert(!generalHasAnimeOnly, "General pool does NOT contain nhd-anime");

  // Rule 9: Anime Pool must NOT have general-only providers
  const animeHasCineSrc = animePool.some((p) => p.id === "cinesrc" || p.id === "vidsrc");
  assert(!animeHasCineSrc, "Anime pool does NOT contain CineSrc or VidSrc");

  // Verify resolution
  const animeResolution = await resolveAnimePlayback({
    anilistId: "16498",
    episode: 1,
    mediaType: "anime",
  });
  assert(animeResolution.poolUsed === "ANIME", "Playback resolution used ANIME pool strictly", animeResolution.poolUsed);
  assert(
    !animeResolution.sources.some((s) => s.providerId === "cinesrc" || s.providerId === "vidsrc"),
    "Anime playback sources contain ZERO General pool providers"
  );

  // ── 5. Anime Episode Engine & Auto-Next Boundary ──
  console.log("\n🔄 5. Testing Canonical Episode Engine & Auto-Next...");
  const nextEp1 = await resolveNextCanonicalEpisode(16498, 1, 1, { totalEpisodes: 25 });
  assert(nextEp1.hasNext === true && nextEp1.nextEpisode === 2, "Next episode from Ep 1 is Ep 2");

  const nextFinal = await resolveNextCanonicalEpisode(16498, 1, 25, { totalEpisodes: 25 });
  assert(nextFinal.hasNext === false, "Final episode 25 has no next episode", `hasNext=${nextFinal.hasNext}`);

  // ── 6. Self-Improving Intelligence Telemetry & Scoring ──
  console.log("\n🧠 6. Testing Self-Improving Telemetry & Dynamic Scoring...");
  providerHealthCache.recordSuccess("nhd-anime", 450);
  const healthA = providerHealthCache.getHealth("nhd-anime");
  assert(healthA.status === "ACTIVE", "Provider health marked ACTIVE on success", healthA.status);
  assert((healthA.score ?? 0) >= 50, "Provider score dynamically calculated based on health & latency", `score=${healthA.score}`);

  console.log("\n================================================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Suite execution error:", err);
  process.exit(1);
});
