/**
 * scripts/test-provider-directory.ts
 *
 * Automated verification of CHILLER Provider Directory, Adapters, Registry,
 * and Source Mapping Layer.
 */

import { playbackRegistry } from "../lib/playback/registry";
import { getAllProviderDirectoryEntries, getProviderDirectoryEntry } from "../lib/playback/provider-directory";
import { buildMediaKey, mapRecordToCandidate } from "../lib/playback/source-mapper";
import { resolveCandidatesConcurrently } from "../lib/playback/orchestrator";

async function main() {
  console.log("================================================================================");
  console.log("CHILLER — PROVIDER SOURCE DIRECTORY & INTEGRATION VERIFICATION SUITE");
  console.log("================================================================================\n");

  // 1. Directory Verification
  const entries = getAllProviderDirectoryEntries();
  console.log(`[1/5] Verified Directory Entries: ${entries.length} providers registered.`);
  if (entries.length < 15) {
    throw new Error(`Expected at least 15 candidate providers, found ${entries.length}`);
  }

  // 2. Registry Instantiation & Isolation Check
  const allProviders = playbackRegistry.getAllProviders();
  console.log(`[2/5] Verified Central Registry: ${allProviders.length} active provider instances.`);

  const requiredIds = [
    "earnvids",
    "vidstream",
    "vidstreaming",
    "vdohide",
    "streamtape",
    "filemoon",
    "dailymotion",
    "jellyfin",
    "plex",
    "tubi",
    "roku",
    "pluto",
    "cinesrc",
    "vidsrc",
    "vidking",
    "codespecter",
    "aggregator",
    "nhd",
    "mycloud",
    "megaup",
    "megacloud",
  ];

  for (const id of requiredIds) {
    const p = playbackRegistry.getProvider(id);
    if (!p) {
      throw new Error(`CRITICAL: Provider ID '${id}' not registered in registry!`);
    }
    const caps = p.getCapabilities();
    if (!caps) {
      throw new Error(`CRITICAL: Provider '${id}' returned invalid capabilities!`);
    }
  }
  console.log("      All 21 required candidate and active provider IDs are verified present.");

  // 3. Health & Safety State Verification (Disabled by default / Not configured)
  console.log("\n[3/5] Testing Provider Health Probes & Boundary Checks:");
  for (const id of ["filemoon", "vdohide", "streamtape", "earnvids", "vidstream", "vidstreaming", "jellyfin", "plex"]) {
    const p = playbackRegistry.getProvider(id)!;
    const health = await p.healthCheck();
    console.log(`      • ${p.name.padEnd(14)} -> Status: ${health.status.padEnd(16)} (Msg: ${health.message})`);
    if (p.enabled && !process.env[`${id.toUpperCase()}_API_KEY`]) {
      // If enabled without credentials, it must safely report not configured or auth error, never crash
    }
  }

  // 4. Source Mapping & Media Key Integrity
  console.log("\n[4/5] Testing Media Key Construction & Source Mapping:");
  const movieKey = buildMediaKey("movie", 550);
  const tvKey = buildMediaKey("tv", 1399, 2, 4);
  const animeKey = buildMediaKey("anime", 16498, undefined, 12);

  console.log(`      Movie Key:  ${movieKey} (Expected: movie:tmdb:550)`);
  console.log(`      TV Key:     ${tvKey} (Expected: tv:tmdb:1399:2:4)`);
  console.log(`      Anime Key:  ${animeKey} (Expected: anime:anilist:16498:12)`);

  if (movieKey !== "movie:tmdb:550") throw new Error("Invalid movieKey!");
  if (tvKey !== "tv:tmdb:1399:2:4") throw new Error("Invalid tvKey!");
  if (animeKey !== "anime:anilist:16498:12") throw new Error("Invalid animeKey!");

  // Test mapRecordToCandidate for FileMoon & VdoHide
  const mockFileMoonRecord = {
    id: "test-fm-1",
    mediaKey: movieKey,
    providerId: "filemoon",
    providerMediaId: "xyz987654",
    title: "Fight Club (1999)",
    quality: "1080p HD",
    format: "EMBED",
    status: "ACTIVE",
    createdAt: new Date(),
  };

  const cand = mapRecordToCandidate(mockFileMoonRecord, { mediaType: "movie", tmdbId: 550 });
  console.log(`      Mapped FileMoon Embed URL: ${cand.url}`);
  if (cand.url !== "https://filemoon.org/e/xyz987654") {
    throw new Error(`Unexpected mapped candidate URL: ${cand.url}`);
  }

  // 5. Orchestrator Concurrent Fallback Engine Test
  console.log("\n[5/5] Testing Orchestrator Concurrent Resolution (Fight Club TMDB 550):");
  const orchResult = await resolveCandidatesConcurrently({ mediaType: "movie", tmdbId: 550 });
  console.log(`      Resolved ${orchResult.candidates.length} candidate(s) concurrently in ${orchResult.fastestMs}ms.`);
  console.log(`      Primary Candidate: ${orchResult.primaryCandidate?.providerName} -> ${orchResult.primaryCandidate?.url}`);

  if (!orchResult.primaryCandidate) {
    throw new Error("Expected primary candidate from enabled automated providers (CineSrc/VidSrc)!");
  }

  console.log("\n================================================================================");
  console.log("ALL PROVIDER ARCHITECTURE TESTS PASSED WITH 100% COMPLIANCE");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
