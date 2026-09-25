import { playbackRegistry } from "../lib/playback/registry";
import { providerHealthCache } from "../lib/playback/health-cache";
import { resolveCandidatesConcurrently } from "../lib/playback/orchestrator";
import { resolveAnimePlayback } from "../lib/playback/anime/anime-resolver";

async function runTestSuite() {
  console.log("====================================================================");
  console.log("CHILLER — HIGH-SPEED MULTI-PROVIDER & FAILOVER ENGINE TEST SUITE");
  console.log("====================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(desc: string, condition: boolean, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${desc}${details ? ` (${details})` : ""}`);
    } else {
      console.error(`  ❌ [FAIL] ${desc}${details ? ` (${details})` : ""}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 1. MULTI-PROVIDER SOURCE ARCHITECTURE & REGISTRY NORMALIZATION
  // ──────────────────────────────────────────────────────────────────
  console.log("📦 1. Testing Multi-Provider Registration & Normalization...");
  const generalProviders = playbackRegistry.getGeneralProviders();
  const animeProviders = playbackRegistry.getAnimeProviders();

  assert(
    "General Pool includes UpStream, MixDrop, DoodStream, Vidoza, FileMoon",
    ["upstream", "mixdrop", "doodstream", "vidoza", "filemoon"].every((id) =>
      generalProviders.some((p) => p.id === id)
    ),
    `Found: ${generalProviders.map((p) => p.id).join(", ")}`
  );

  assert(
    "Anime Pool includes NHD Anime, Provider A, B, C, MegaCloud",
    ["nhd-anime", "anime-provider-a", "anime-provider-b", "anime-provider-c", "megacloud-anime"].every((id) =>
      animeProviders.some((p) => p.id === id)
    ),
    `Found: ${animeProviders.map((p) => p.id).join(", ")}`
  );

  assert(
    "Zero General Providers appear in Anime Pool",
    animeProviders.every((p) => p.pools?.includes("ANIME")),
    "Strict isolation verified"
  );

  // ──────────────────────────────────────────────────────────────────
  // 2. CONCURRENT RESOLUTION & BOUNDED LATENCY
  // ──────────────────────────────────────────────────────────────────
  console.log("\n⚡ 2. Testing Concurrent Resolution & Bounded Latency...");
  const t0 = Date.now();
  const movieResolution = await resolveCandidatesConcurrently({
    mediaType: "movie",
    tmdbId: 550, // Fight Club
    title: "Fight Club",
  });
  const movieLatency = Date.now() - t0;

  assert(
    "Movie resolves candidates concurrently without sequential blocking",
    movieResolution.candidates.length > 0 && movieLatency < 2500,
    `Resolved ${movieResolution.candidates.length} candidates in ${movieLatency}ms`
  );

  assert(
    "Primary candidate is present and normalized",
    !!movieResolution.primaryCandidate && !!movieResolution.primaryCandidate.url,
    `Primary: ${movieResolution.primaryCandidate?.providerName} (${movieResolution.primaryCandidate?.url})`
  );

  const t1 = Date.now();
  const animeResolution = await resolveAnimePlayback({
    anilistId: 16498, // Attack on Titan
    season: 1,
    episode: 1,
    language: "sub",
    variant: "sub",
  });
  const animeLatency = Date.now() - t1;

  assert(
    "Anime resolves candidates from dedicated anime pool",
    animeResolution.sources.length > 0 && animeLatency < 2500,
    `Resolved ${animeResolution.sources.length} sources in ${animeLatency}ms`
  );

  // ──────────────────────────────────────────────────────────────────
  // 3. FAILURE RECOVERY & CIRCUIT BREAKER TEST
  // ──────────────────────────────────────────────────────────────────
  console.log("\n🛡️ 3. Testing Circuit Breaker & Automatic Failover...");
  const primaryProviderId = movieResolution.primaryCandidate?.providerId || "cinesrc";
  const primaryProvider = playbackRegistry.getProvider(primaryProviderId);

  // Record 3 consecutive failures to trigger degraded status
  providerHealthCache.recordFailure(primaryProviderId, "HTTP 503 Provider Down");
  providerHealthCache.recordFailure(primaryProviderId, "HTTP 503 Provider Down");
  providerHealthCache.recordFailure(primaryProviderId, "HTTP 503 Provider Down");

  const healthAfterFailures = providerHealthCache.getHealth(primaryProviderId);
  assert(
    "Circuit breaker detects consecutive failures and marks provider DEGRADED",
    healthAfterFailures.status === "DEGRADED",
    `Status: ${healthAfterFailures.status}, Score: ${healthAfterFailures.score}`
  );

  // Intentionally disable the primary provider
  if (primaryProvider) primaryProvider.enabled = false;

  const fallbackResolution = await resolveCandidatesConcurrently({
    mediaType: "movie",
    tmdbId: 550,
    title: "Fight Club",
  });

  assert(
    "Automatic failover chooses next healthy compatible mirror",
    fallbackResolution.primaryCandidate?.providerId !== primaryProviderId,
    `New Primary: ${fallbackResolution.primaryCandidate?.providerName} (${fallbackResolution.primaryCandidate?.providerId})`
  );

  // Restore provider and record success
  if (primaryProvider) primaryProvider.enabled = true;
  providerHealthCache.recordSuccess(primaryProviderId, 150);
  const healthAfterRecovery = providerHealthCache.getHealth(primaryProviderId);

  assert(
    "Restoring provider and recording playback success recovers ACTIVE status",
    healthAfterRecovery.status === "ACTIVE",
    `Status: ${healthAfterRecovery.status}, Score: ${healthAfterRecovery.score}`
  );

  // ──────────────────────────────────────────────────────────────────
  // 4. TEST MATRIX: 25 MOVIES, 10 TV SHOWS, 25 ANIME
  // ──────────────────────────────────────────────────────────────────
  console.log("\n📊 4. Running Matrix Validation (25 Movies, 10 TV Titles, 25 Anime Titles)...");

  const sampleMovies = [
    { id: 550, title: "Fight Club" },
    { id: 27205, title: "Inception" },
    { id: 157336, title: "Interstellar" },
    { id: 299536, title: "Avengers: Infinity War" },
    { id: 299534, title: "Avengers: Endgame" },
    { id: 155, title: "The Dark Knight" },
    { id: 597, title: "Titanic" },
    { id: 19995, title: "Avatar" },
    { id: 76600, title: "Avatar: The Way of Water" },
    { id: 680, title: "Pulp Fiction" },
    { id: 13, title: "Forrest Gump" },
    { id: 122, title: "The Lord of the Rings: The Return of the King" },
    { id: 120, title: "The Lord of the Rings: The Fellowship of the Ring" },
    { id: 121, title: "The Lord of the Rings: The Two Towers" },
    { id: 603, title: "The Matrix" },
    { id: 8587, title: "The Lion King" },
    { id: 24428, title: "The Avengers" },
    { id: 372058, title: "Your Name" },
    { id: 496243, title: "Parasite" },
    { id: 872585, title: "Oppenheimer" },
    { id: 346698, title: "Barbie" },
    { id: 569094, title: "Spider-Man: Across the Spider-Verse" },
    { id: 385687, title: "Fast X" },
    { id: 447365, title: "Guardians of the Galaxy Vol. 3" },
    { id: 693134, title: "Dune: Part Two" },
  ];

  let movieSuccess = 0;
  for (const m of sampleMovies) {
    const res = await resolveCandidatesConcurrently({ mediaType: "movie", tmdbId: m.id });
    if (res.candidates.length > 0) movieSuccess++;
  }
  assert("25 Movies resolved successfully with valid mirrors", movieSuccess === 25, `${movieSuccess}/25 succeeded`);

  const sampleTV = [
    { id: 1399, title: "Game of Thrones" },
    { id: 100088, title: "The Last of Us" },
    { id: 66732, title: "Stranger Things" },
    { id: 1396, title: "Breaking Bad" },
    { id: 84958, title: "Loki" },
    { id: 94605, title: "Arcane" },
    { id: 63174, title: "Lucifer" },
    { id: 71446, title: "Money Heist" },
    { id: 60059, title: "Better Call Saul" },
    { id: 70523, title: "Dark" },
  ];

  let tvSuccess = 0;
  for (const t of sampleTV) {
    const res = await resolveCandidatesConcurrently({ mediaType: "tv", tmdbId: t.id, season: 1, episode: 1 });
    if (res.candidates.length > 0) tvSuccess++;
  }
  assert("10 TV titles resolved successfully with valid mirrors", tvSuccess === 10, `${tvSuccess}/10 succeeded`);

  const sampleAnime = [
    { id: 16498, title: "Attack on Titan" },
    { id: 154587, title: "Frieren: Beyond Journey's End" },
    { id: 21, title: "One Piece" },
    { id: 20, title: "Naruto" },
    { id: 1735, title: "Naruto: Shippuden" },
    { id: 1535, title: "Death Note" },
    { id: 11061, title: "Hunter x Hunter (2011)" },
    { id: 5114, title: "Fullmetal Alchemist: Brotherhood" },
    { id: 20605, title: "Tokyo Ghoul" },
    { id: 101922, title: "Demon Slayer: Kimetsu no Yaiba" },
    { id: 113415, title: "Jujutsu Kaisen" },
    { id: 98444, title: "Solo Leveling" },
    { id: 21459, title: "My Hero Academia" },
    { id: 99147, title: "Black Clover" },
    { id: 140960, title: "Spy x Family" },
    { id: 127230, title: "Chainsaw Man" },
    { id: 199, title: "Spirited Away" },
    { id: 164, title: "Princess Mononoke" },
    { id: 431, title: "Howl's Moving Castle" },
    { id: 116588, title: "KonoSuba" },
    { id: 108465, title: "Mushoku Tensei" },
    { id: 145064, title: "Jujutsu Kaisen Season 2" },
    { id: 145139, title: "Oshi no Ko" },
    { id: 146065, title: "Bleach: Thousand-Year Blood War" },
    { id: 269, title: "Bleach" },
  ];

  let animeSuccess = 0;
  for (const a of sampleAnime) {
    const res = await resolveAnimePlayback({ anilistId: a.id, season: 1, episode: 1, language: "sub", variant: "sub" });
    if (res.sources.length > 0) animeSuccess++;
  }
  assert("25 Anime titles resolved successfully with dedicated anime mirrors", animeSuccess === 25, `${animeSuccess}/25 succeeded`);

  // ──────────────────────────────────────────────────────────────────
  // 5. SUMMARY
  // ──────────────────────────────────────────────────────────────────
  console.log("\n====================================================================");
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log("====================================================================\n");

  if (totalTests !== passedTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
