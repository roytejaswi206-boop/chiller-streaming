/**
 * scripts/verify-dual-playback.ts
 *
 * CHILLER DUAL PLAYBACK ROUTING SYSTEM — VERIFICATION TEST SUITE
 *
 * Tests:
 * 1. Media Classifier: Classification accuracy across Movie, TV, Anime, Anime Movie
 * 2. Pool Registry: Isolation of General Pool (Pool A) vs Anime Pool (Pool B)
 * 3. General Playback Routing: Movies and TV route to General Pool, Anime providers are excluded
 * 4. Dedicated Anime Playback Routing: Anime routes to Anime Pool, General providers are excluded
 * 5. Anime Episode Mapper & Auto Next: Canonical next episode, absolute mapping, boundary conditions
 * 6. Resolver Integration: End-to-end resolution with skipped provider diagnostics
 */

import { classifyMedia } from "../lib/playback/media-classifier";
import { playbackRegistry } from "../lib/playback/registry";
import { resolveAnimePlayback as resolveDedicatedAnimePlayback } from "../lib/playback/anime/anime-resolver";
import { resolveMoviePlayback, resolveTVPlayback, resolveAnimePlayback } from "../lib/playback/resolver";
import {
  resolveNextEpisode,
  mapAnimeEpisode,
} from "../lib/playback/anime/episode-mapper";
import { PlaybackRequest } from "../lib/playback/types";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` (${detail})` : ""}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` (${detail})` : ""}`);
    failCount++;
  }
}

async function runTests() {
  console.log("================================================================");
  console.log("   CHILLER DUAL PLAYBACK ROUTING SYSTEM — TEST SUITE            ");
  console.log("================================================================\n");

  // -------------------------------------------------------------------------
  // TEST SUITE 1: Media Classifier
  // -------------------------------------------------------------------------
  console.log("📦 1. Testing Media Classifier...");
  
  const movieClassification = classifyMedia({
    mediaType: "movie",
    tmdbId: 550,
    title: "Fight Club",
  });
  assert(
    movieClassification.targetPool === "GENERAL" && movieClassification.mediaClass === "MOVIE",
    "Movie (Fight Club TMDB 550) routes to GENERAL pool",
    `pool=${movieClassification.targetPool}, class=${movieClassification.mediaClass}`
  );

  const tvClassification = classifyMedia({
    mediaType: "tv",
    tmdbId: 100088,
    title: "The Last of Us",
    season: 1,
    episode: 1,
  });
  assert(
    tvClassification.targetPool === "GENERAL" && tvClassification.mediaClass === "TV",
    "TV Show (The Last of Us TMDB 100088) routes to GENERAL pool",
    `pool=${tvClassification.targetPool}, class=${tvClassification.mediaClass}`
  );

  const animeSeriesClassification = classifyMedia({
    mediaType: "anime",
    anilistId: 154587,
    title: "Frieren: Beyond Journey's End",
    format: "TV",
    genres: ["Animation", "Adventure", "Fantasy"],
  });
  assert(
    animeSeriesClassification.targetPool === "ANIME" && animeSeriesClassification.mediaClass === "ANIME",
    "Anime TV Series (Frieren AniList 154587) routes to ANIME pool",
    `pool=${animeSeriesClassification.targetPool}, class=${animeSeriesClassification.mediaClass}`
  );

  const animeMovieClassification = classifyMedia({
    mediaType: "anime",
    anilistId: 199,
    title: "Spirited Away",
    format: "MOVIE",
    genres: ["Animation", "Adventure", "Family", "Fantasy"],
  });
  assert(
    animeMovieClassification.targetPool === "ANIME" && animeMovieClassification.mediaClass === "ANIME_MOVIE",
    "Anime Movie (Spirited Away AniList 199) routes to ANIME pool as ANIME_MOVIE",
    `pool=${animeMovieClassification.targetPool}, class=${animeMovieClassification.mediaClass}`
  );

  const tmdbAnimeClassification = classifyMedia({
    mediaType: "tv",
    tmdbId: 85937,
    title: "Demon Slayer: Kimetsu no Yaiba",
    genres: ["Animation", "Action & Adventure", "Sci-Fi & Fantasy"],
    country: "JP",
  });
  assert(
    tmdbAnimeClassification.targetPool === "ANIME",
    "TMDB Japanese Animation detects Anime and routes to ANIME pool",
    `pool=${tmdbAnimeClassification.targetPool}, class=${tmdbAnimeClassification.mediaClass}`
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Pool Registry & Isolation
  // -------------------------------------------------------------------------
  console.log("\n🔒 2. Testing Provider Pool Registry & Strict Isolation...");

  const generalProviders = playbackRegistry.getGeneralProviders();
  const animeProviders = playbackRegistry.getAnimeProviders();

  assert(
    generalProviders.length > 0,
    "General Pool has registered providers",
    `count=${generalProviders.length}`
  );
  assert(
    animeProviders.length > 0,
    "Anime Pool has registered providers",
    `count=${animeProviders.length}`
  );

  // General providers must NOT contain anime-exclusive providers
  const animeInGeneral = generalProviders.filter((p) =>
    p.id.toLowerCase().includes("anime-slot") || p.id === "megacloud-anime"
  );
  assert(
    animeInGeneral.length === 0,
    "General Pool contains NO anime-only providers",
    `found=${animeInGeneral.map((p) => p.id).join(", ") || "none"}`
  );

  // Anime providers must have supportsAnime = true
  const invalidAnimeProviders = animeProviders.filter(
    (p) => !p.getCapabilities().supportsAnime && !p.getCapabilities().supportsAnimeMovie
  );
  assert(
    invalidAnimeProviders.length === 0,
    "All Anime Pool providers explicitly declare anime capability",
    `invalid=${invalidAnimeProviders.map((p) => p.id).join(", ") || "none"}`
  );

  // Ranked providers
  const rankedGeneral = playbackRegistry.rankGeneralProviders({
    mediaType: "movie",
    tmdbId: 550,
  });
  const rankedAnime = playbackRegistry.rankAnimeProviders({
    mediaType: "anime",
    anilistId: 154587,
    episode: 1,
  });
  const topGeneral = rankedGeneral[0];
  const topAnime = rankedAnime[0];
  assert(
    Boolean(topGeneral && topGeneral.pools?.includes("GENERAL")),
    "Ranked General top provider belongs to GENERAL pool",
    `top=${topGeneral?.id}`
  );
  assert(
    Boolean(topAnime && topAnime.pools?.includes("ANIME")),
    "Ranked Anime top provider belongs to ANIME pool",
    `top=${topAnime?.id}`
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 3: General Playback Routing (Zero Regression)
  // -------------------------------------------------------------------------
  console.log("\n🎬 3. Testing General Playback Routing (Movie & TV)...");

  // Movie Playback: Must resolve from general pool (e.g. CineSrc / VidSrc)
  const movieRes = await resolveMoviePlayback(550);
  assert(
    movieRes.sources.length > 0 && movieRes.primarySource !== null,
    "Movie resolution succeeds",
    `provider=${movieRes.primarySource?.providerId}, url=${movieRes.primarySource?.url}`
  );
  assert(
    movieRes.primarySource?.providerId !== "nhd-anime" &&
      !movieRes.primarySource?.providerId?.includes("anime"),
    "Movie candidate did NOT come from Anime pool",
    `provider=${movieRes.primarySource?.providerId}`
  );
  assert(
    Boolean(movieRes.primarySource?.url?.includes("550")),
    "Movie embed URL contains TMDB ID",
    `url=${movieRes.primarySource?.url}`
  );

  // TV Playback: Must resolve from general pool
  const tvRes = await resolveTVPlayback(100088, 1, 1);
  assert(
    tvRes.sources.length > 0 && tvRes.primarySource !== null,
    "TV resolution succeeds",
    `provider=${tvRes.primarySource?.providerId}, url=${tvRes.primarySource?.url}`
  );
  assert(
    tvRes.primarySource?.providerId !== "nhd-anime" &&
      !tvRes.primarySource?.providerId?.includes("anime"),
    "TV candidate did NOT come from Anime pool",
    `provider=${tvRes.primarySource?.providerId}`
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 4: Dedicated Anime Playback Routing
  // -------------------------------------------------------------------------
  console.log("\n⛩️ 4. Testing Dedicated Anime Playback Routing...");

  const animeRes = await resolveDedicatedAnimePlayback({
    anilistId: 154587,
    episode: 1,
    title: "Frieren: Beyond Journey's End",
  });

  assert(
    animeRes.sources.length > 0 && animeRes.primarySource !== null,
    "Dedicated Anime resolution succeeds",
    `provider=${animeRes.primarySource?.providerId}, pool=${animeRes.poolUsed}`
  );
  assert(
    Boolean(
      animeRes.primarySource?.providerId === "nhd-anime" ||
        animeRes.primarySource?.providerId?.includes("anime")
    ),
    "Anime candidate came from ANIME pool",
    `provider=${animeRes.primarySource?.providerId}`
  );
  assert(
    Boolean(animeRes.primarySource?.url?.includes("154587")),
    "Anime embed URL targets AniList ID directly (no TMDB TV mismatch)",
    `url=${animeRes.primarySource?.url}`
  );
  assert(
    animeRes.providersSkipped.length > 0,
    "General providers are strictly skipped and reported in anime diagnostics",
    `skippedCount=${animeRes.providersSkipped.length}`
  );

  // Verify resolveAnimePlayback helper
  const animeHelperRes = await resolveAnimePlayback(154587, 1);
  assert(
    Boolean(
      animeHelperRes.sources.length > 0 &&
        (animeHelperRes.primarySource?.providerId === "nhd-anime" ||
          animeHelperRes.primarySource?.providerId?.includes("anime"))
    ),
    "Unified resolveAnimePlayback correctly resolves via dedicated anime pool",
    `provider=${animeHelperRes.primarySource?.providerId}`
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 5: Anime Episode Mapping & Auto Next
  // -------------------------------------------------------------------------
  console.log("\n🔄 5. Testing Anime Episode Mapper & Auto Next...");

  // Next episode for standard ongoing series
  const nextEpNormal = await resolveNextEpisode(154587, 1, 5, { totalEpisodes: 28 });
  assert(
    Boolean(nextEpNormal.hasNext && nextEpNormal.nextEpisode === 6 && !nextEpNormal.isFinalEpisode),
    "Standard episode increments normally (Ep 5 -> Ep 6)",
    `next=${nextEpNormal.nextEpisode}, isFinal=${nextEpNormal.isFinalEpisode}`
  );

  // Final episode detection
  const nextEpFinal = await resolveNextEpisode(154587, 1, 28, { totalEpisodes: 28 });
  assert(
    Boolean(!nextEpFinal.hasNext && nextEpFinal.isFinalEpisode),
    "Final episode boundary detected (Ep 28 of 28 -> isFinalEpisode=true)",
    `hasNext=${nextEpFinal.hasNext}, isFinal=${nextEpFinal.isFinalEpisode}`
  );

  // Absolute to seasonal mapping
  const mappedSeasonal = mapAnimeEpisode({
    anilistId: 21,
    episode: 1000,
  });
  assert(
    mappedSeasonal.episode === 1000,
    "Preserves absolute episode number for long-running anime (One Piece Ep 1000)",
    `episode=${mappedSeasonal.episode}`
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n================================================================");
  console.log(`   TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED       `);
  console.log("================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution threw an uncaught error:", err);
  process.exit(1);
});
