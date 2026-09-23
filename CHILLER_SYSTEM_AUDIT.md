# CHILLER — Comprehensive System Architecture & Runtime Audit

**Date**: 2026-09-23  
**Status**: System Recovery & Hardening Audit  
**Target**: Production-grade multi-format streaming platform (Movies, TV, Anime, Documentaries)

---

## Executive Summary
This audit provides an unvarnished, deep-dive evaluation of the CHILLER platform codebase, runtime services, player components, metadata fabric, and database models. The goal is to identify all architectural flaws, edge-case failures, and single points of failure before systematically implementing the production-grade architecture.

---

## A. What Already Works
1. **General Movie Playback (Pool A)**:
   - TMDB-based movie metadata fetching via `getMovieDetails(tmdbId)`.
   - General provider resolution via CineSrc (`https://cinesrc.st/embed/movie/${tmdbId}`) and VidSrc (`https://vidsrc.sbs/embed/movie/${tmdbId}`).
   - Fast resolution with concurrent provider probing.
2. **General TV Playback (Pool A)**:
   - TMDB-based TV series metadata and season episode breakdowns via `getTVDetails` and `getSeasonDetails`.
   - General provider resolution (`cinesrc.st/embed/tv/${tmdbId}?s=${s}&e=${e}`).
3. **Dedicated Anime Provider Isolation (Pool B Baseline)**:
   - General providers (`CineSrc`, `VidSrc`, `Vidking`) reject anime requests (`supportsAnime: false`).
   - Dedicated anime providers (`NHDAnimeProvider`, `AnimeProviderA/B/C`, `MegaCloudAnimeProvider`) grouped into `ANIME` pool.
   - Provider registry separates `rankGeneralProviders` from `rankAnimeProviders`.
4. **Live Browser Playback for Popular Anime via NHD Embed**:
   - Attack on Titan (`AniList 16498` Ep 1): Verified in live browser — iframe loaded, video stream loaded, and video progressed through prologue to main scout scene.
   - Demon Slayer (`AniList 101922` Ep 1): Verified in live browser — iframe loaded, video stream started, Tanjiro snow forest scene progressed.
5. **Next.js & Database Foundation**:
   - Next.js 16 with Turbopack dev server and App Router.
   - Prisma ORM with SQLite dev database (and PostgreSQL production schema ready in `schema.postgresql.prisma`).
   - NextAuth authentication with credentials and Super Admin RBAC.

---

## B. What Partially Works
1. **Anime Watch Experience**:
   - Page renders title, artwork, and anime tag correctly, but relies on a single provider (NHD) in default setup. If NHD does not index a specific anime ID (e.g. Frieren `154587`), the player displays an unhandled error inside the iframe ("This title doesn't appear to be available on any provider yet") without triggering automatic fallback to secondary anime slots.
2. **Anime Metadata**:
   - `AniListContentProvider` queries GraphQL, but if AniList is rate-limited (HTTP 429) or times out, the watch page resolver crashes or attempts fallback to TMDB TV, causing 404s.
3. **Continue Watching / Watch History**:
   - Works for movies and TV shows with numeric `tmdbId`, but history schema lacks `anilistId` and `mediaKey`, leading to collisions or failed queries when tracking progress on anime without TMDB IDs.
4. **Search Experience**:
   - Multi-provider search exists in `lib/content/discovery.ts`, but lacks robust fuzzy matching, synonym resolution (e.g. "AoT" -> "Attack on Titan", "Demon Slayer" -> "Kimetsu no Yaiba"), and debounced request deduplication on the client.

---

## C. What Is Broken
1. **AniList to TMDB Identity Confusion in Slug Parser (`lib/playback/identity.ts`)**:
   - Line 51: `if (type === "anime") return { mediaType: "anime", anilistId: parsedId, tmdbId: parsedId, ... }`
   - Injects AniList ID as TMDB ID, causing downstream components to treat `anilistId` as `tmdbId`.
2. **Fallback Leakage in Content Resolver (`lib/playback/resolver.ts`)**:
   - If `AniListContentProvider.getAnime(parsed.anilistId)` returns null, the code falls through to `getTVDetails(tmdbId)` and queries TMDB TV with an AniList ID.
3. **History Collision on Anime Upsert (`app/api/user/history/route.ts`)**:
   - `prisma.watchHistory.findFirst` queries `{ userId: user.id, ...(tmdbId ? { tmdbId } : videoId ? { videoId } : {}) }`. When watching an anime without `tmdbId`, it searches `{ userId }` only, matching and overwriting whatever random title the user watched last!

---

## D. What Is Missing
1. **Canonical Media Identity Layer (`/lib/media/identity/`)**:
   - Unified `ChillerMediaIdentity` holding crosswalk mappings (`chillerId`, `anilistId`, `malId`, `kitsuId`, `simklId`, `tmdbId`, `imdbId`).
   - Multi-source ID crosswalk table and title alias matcher.
2. **Multi-Source Anime Metadata Fabric**:
   - Automated fallback pipeline: AniList (primary) → Jikan / MyAnimeList → Kitsu → SIMKL → TMDB Anime.
   - In-memory & Redis caching with rate-limit backoff (handling AniList 90 req/min limit).
3. **Multi-Provider Anime Stream Fallback**:
   - When NHD lacks streams for a title, seamlessly query Slot A, Slot B, Slot C, and MegaCloud/RapidCloud adapters.
4. **Unified Subsystem Health Model**:
   - A single structured status (`HEALTHY`, `DEGRADED`, `FAILING`, `DISABLED`) across metadata, general playback, anime playback, cache, database, and auth.
5. **Self-Improving Routing Intelligence**:
   - Autonomous routing score calculation based on real observed playback success rates without altering source code.
6. **Detailed Season / Cour / Special Engine for Anime**:
   - Accurate display of Part 1, Part 2, Final Season, OVAs, and canonical next episode discovery.

---

## E. Duplicate Implementations
1. **Identity Normalization**:
   - Handled separately in `lib/playback/identity.ts`, `lib/content/id-mapper.ts`, and `lib/playback/source-mapper.ts`. Needs consolidation into `/lib/media/identity/`.
2. **Media Classification**:
   - Handled in `lib/playback/media-classifier.ts` and ad-hoc string checks in components.

---

## F. Dangerous Assumptions
1. **Assumption that AniList ID === TMDB ID**:
   - Confusing AniList ID with TMDB ID causes 404s on TMDB endpoints and passes invalid parameters to upstream providers.
2. **Assumption that HTTP 200 on Embed === Playback Success**:
   - External iframes return HTTP 200 even when displaying "Video not found" or "Provider unavailable" inside their HTML. Real playback requires player event verification or observation.
3. **Assumption that Next Episode is always `Episode + 1`**:
   - Fails on series finales, split cours, and multi-season transitions.

---

## G. External Provider Dependencies
1. **AniList GraphQL API**:
   - Rate limit: 90 requests per minute. Requires in-flight caching and Jikan/Kitsu fallbacks.
2. **Jikan (MyAnimeList Gateway)**:
   - Rate limit: 3 requests per second, 60 per minute. Requires caching and throttling.
3. **TMDB API (v3/v4)**:
   - Primary metadata source for Movies and TV.
4. **Streaming Providers**:
   - Pool A: CineSrc, VidSrc, Vidking.
   - Pool B: NHD Anime, Configurable Slots A/B/C, MegaCloud.

---

## H. Browser-Only Failures
1. **Cross-Origin Sandbox Restrictions**:
   - Third-party iframes cannot be directly inspected via DOM if they lack postMessage events or use restrictive sandbox attributes.
2. **Autoplay Policies**:
   - Browsers block unmuted autoplay without prior user interaction. The player must default to muted autoplay or provide clear tap-to-unmute prompts.
3. **Mobile Viewport Sizing**:
   - In-app browsers require strict aspect-ratio containers to prevent fullscreen overflow.

---

## I. Performance Bottlenecks
1. **Sequential Provider Probing**:
   - Trying providers one-by-one causes 10+ second delays when top providers fail. Bounded concurrent probing is required.
2. **Uncached GraphQL Queries**:
   - Repeatedly requesting AniList GraphQL on every episode navigation wastes rate-limit quota.
3. **Un-indexed Database Lookups**:
   - Querying `watch_history` without `anilistId` or composite indexes slows down user profile loads.

---

## J. Security Problems
1. **Lack of SSRF Validation on Proxy Endpoints**:
   - Any proxy endpoint accepting a target URL must strictly allowlist authorized hostnames.
2. **Super Admin Access Controls**:
   - Ensure admin routes are protected by role checks and email allowlists.
3. **Sensitive Key Exposure**:
   - Verified that all API keys and bearer tokens remain server-side and `.env` is ignored in Git.

---

## K. Data Consistency Problems
1. **Watch History Progress Desynchronization**:
   - Rapid timeupdate events can overwhelm the database with writes and cause race conditions. Throttled/debounced updates (every 5-10 seconds) are mandatory.
2. **Mixed Media Keys in Cache**:
   - Cache keys must be namespaced with their origin (e.g. `anime:anilist:154587` vs `tv:tmdb:100088`).

---

## L. Production Deployment Risks
1. **Database Migration**:
   - SQLite is used in local development. When migrating to PostgreSQL for production (`schema.postgresql.prisma`), all BigInt and index types must match.
2. **Memory Leaks in Background Daemons**:
   - Health check probes and deduplication caches must enforce maximum TTLs and cache size limits to prevent heap exhaustion.

---

## Action Plan
Proceed to **Phase 2: Canonical Media Identity Layer** and execute each phase sequentially through to real browser verification.
