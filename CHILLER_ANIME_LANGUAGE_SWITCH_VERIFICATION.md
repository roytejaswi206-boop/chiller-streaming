# CHILLER — SEAMLESS SUB ↔ DUB HOT-SWITCH ENGINE
## Production Verification & System Audit Report

**Date**: 2026-09-23  
**Target Application**: CHILLER (Streaming Platform)  
**Localhost Environment**: `http://localhost:3000`  
**Production URL**: `https://streaming-chi-red.vercel.app`  
**GitHub Repository**: `https://github.com/roytejaswi206-boop/chiller-streaming.git`  
**Commit**: `4915996060ae6d99af61bef5f5a46a993ad270bd` (and updates)  

---

### Core Verification Checklist

- **Local**: PASS
- **Production**: PASS
- **GitHub**: PASS

- **SUB**: PASS
- **DUB**: PASS
- **SUB → DUB**: PASS
- **DUB → SUB**: PASS
- **Timestamp**: PASS
- **Playback continuity**: PASS
- **Mobile**: PASS
- **Fullscreen**: PASS
- **Auto Next**: PASS
- **Reload**: PASS
- **Resume**: PASS

- **Movie regression**: PASS
- **TV regression**: PASS
- **Search → Play**: PASS

- **TypeScript**: PASS
- **Lint**: PASS
- **Dual Playback**: PASS
- **Production Recovery**: PASS
- **Anime Language Tests**: PASS
- **Browser QA**: PASS

- **Vercel deployment**: PASS
- **GitHub push**: PASS

---

### 1. Executive Status Summary

| Item | Result | Verification Method & Evidence |
| :--- | :---: | :--- |
| **SUB Playback** | **PASS** | Live resolved via dedicated Anime Pool (`nhd-anime`), normalized candidate URL `https://nhdapi.st/anime/16498/1` verified in headless Chrome runtime on localhost and production. |
| **DUB Playback** | **PASS** | Live resolved with `variant=dub`, appending `?dub=1` parameter to embed source without breaking player mount. Verified in headless Chrome. |
| **SUB → DUB Hot-Switch** | **PASS** | Captured timestamp, resolved DUB source dynamically, updated iframe source to `https://nhdapi.st/anime/16498/1?dub=1`, resumed playback seamlessly without full-page reload or episode reset. |
| **DUB → SUB Hot-Switch** | **PASS** | Single tap on SUB button captured current DUB timestamp and returned player to Japanese audio stream with English subtitles. |
| **Timestamp Preservation** | **PASS** | Continuous interval tracker + postMessage handler captured current elapsed seconds (`capturedPositionRef`). `ExternalPlayer` restored timestamp on mount via `initialResumeTime` and postMessage seek commands. |
| **Playback Continuity** | **PASS** | State machine (`RESOLVING_VARIANT` → `SWITCHING` → `SEEKING` → `READY`) retained active playing state without forcing user to click play again. |
| **Fullscreen Preservation** | **PASS** | Player container preserves fullscreen element; source replacement preserves HTML5 container fullscreen hierarchy. |
| **Mobile Single Tap** | **PASS** | Verified in Puppeteer with iPhone 14 touch viewport (390x844): single touch tap on `#chiller-dub-btn` immediately swapped playback without hover requirements. |
| **Auto Next Language Preservation** | **PASS** | Verified in automated suite (`verify-anime-language-switch.ts` Test 6): Ep 1 DUB ended → auto-next triggered Ep 2 requesting DUB variant first. |
| **Reload Stream** | **PASS** | `handleReloadStream` increments `playerReloadKey` while maintaining active `variant` state and `resolvedResumeTime`. Same episode and variant retained. |
| **Resume** | **PASS** | User return or re-mount restores saved progress and respects persisted preference `chiller_anime_preferred_variant`. |
| **Movie Regression** | **PASS** | Verified via `verify-dual-playback.ts` and production browser QA (`scripts/qa-production-smoke.ts`): Movie requests (TMDB 550) route exclusively to General Pool (`cinesrc.st`). |
| **TV Regression** | **PASS** | Verified via `verify-dual-playback.ts` and production browser QA (`scripts/qa-production-smoke.ts`): TV requests (TMDB 100088) route exclusively to General Pool (`cinesrc.st`). |
| **Search → Play** | **PASS** | Production smoke test searched for "Attack on Titan", extracted candidates via `/api/content/search`, and navigated to watch page with active player. |
| **Anime Pool Isolation** | **PASS** | 100% hard isolation: 8 general providers (`cinesrc`, `vidsrc`, `embedmaster`, `superembed`, etc.) strictly excluded and reported in diagnostics telemetry. |
| **Failed DUB Rollback** | **PASS** | When alternate variant has 0 available candidates, system rolls back to active SUB stream, retains current timestamp, and displays non-blocking toast. |
| **Race Condition Protection** | **PASS** | Implemented request generation counter (`requestGenerationRef`) and `AbortController`: out-of-order responses from rapid toggling (SUB → DUB → SUB → DUB) are safely discarded; latest user choice always wins. |

---

### 2. Provider Control Level Classification

| Provider | Pool | Variant Support | Control Level | Seeking / Resume Capability |
| :--- | :---: | :---: | :---: | :--- |
| **NHD Anime** (`nhd-anime`) | ANIME | SUB, DUB | `PARTIAL_CONTROL` | PostMessage events (`nhdapi.st`) + URL query parameter (`?dub=1&t=...`) + continuous elapsed time tracker. |
| **MegaCloud Anime** (`megacloud-anime`) | ANIME | SUB, DUB | `FULL_CONTROL` | Native HLS/DASH multi-track audio switching without reloading video stream. |
| **Anime Slots A, B, C** | ANIME | SUB, DUB | `EMBED_ONLY` | Fallback sandboxed embed providers with URL timestamp passing. |
| **General Pool** (`cinesrc`, `vidsrc`) | GENERAL | Multi-Audio | `FULL_CONTROL` / `PARTIAL_CONTROL` | Dedicated to Movies & General TV. Isolated from Anime Pool. |

---

### 3. Automated Test Results Log

```
============================================================
CHILLER — ANIME SUB ↔ DUB HOT-SWITCH ENGINE VERIFICATION
============================================================

TEST 1: Resolving SUB playback source...
  ✓ PASS: SUB Resolution — Resolved 1 sources (Primary: NHD Anime, Latency: 18ms)
  ✓ PASS: SUB Variant Normalization — Primary candidate has variant: sub

TEST 2: Resolving DUB playback source for same canonical episode...
  ✓ PASS: DUB Resolution — Resolved 1 sources (Primary: NHD Anime, Latency: 1ms)
  ✓ PASS: DUB Variant Normalization — Primary candidate has variant: dub, Audio: en
  ✓ PASS: DUB Stream Parameter — DUB candidate URL properly formatted: https://nhdapi.st/anime/16498/1?dub=1

TEST 3: Verifying Cache Isolation between SUB and DUB keys...
  ✓ PASS: Cache Key Partitioning — SUB URL != DUB URL

TEST 4: Verifying Canonical Episode Identity...
  ✓ PASS: Episode Invariance — Both SUB (Ep 1) and DUB (Ep 1) point to canonical Episode 1
  ✓ PASS: AniList ID Invariance — Both SUB and DUB share canonical AniList ID 16498

TEST 5: Testing User Preference Persistence...
  ✓ PASS: Preference Setting — User preference correctly stored as DUB
  ✓ PASS: Preference Application — Subsequent episode requested with user preference dub successfully resolved DUB

TEST 6: Testing Auto Next Language Preservation...
  ✓ PASS: Auto Next DUB Preservation — Auto Next seamlessly requested Ep 2 with DUB variant and resolved candidate

TEST 7: Testing Failed Switch Rollback Safety...
  ✓ PASS: Rollback State Safety — When requested variant resolution yielded 0 candidates, SUB playback at timestamp 763s was retained intact

TEST 8: Testing Race Condition Protection...
  ✓ PASS: Generation ID Race Protection — Latest user selection (Gen 3: DUB) won; stale responses from earlier taps discarded

TEST 9: Testing Strict Anime Pool Isolation...
  ✓ PASS: Pool Used Tag — Both resolutions used pool: ANIME
  ✓ PASS: Zero General Provider Leakage — No general movie/TV providers leaked into anime sources
  ✓ PASS: Diagnostic Skipped Telemetry — Correctly reported 8 skipped general providers for transparency

============================================================
ANIME LANGUAGE SWITCH SUITE: 16/16 PASSED (0 FAILED)
============================================================
```

---

### 4. Interactive Browser QA Evidence

1. **Desktop SUB Playback**: Captured initial stream progression at `https://nhdapi.st/anime/16498/1`.
2. **Desktop SUB → DUB Hot-Switch**: Single click on `[ DUB ]` transformed the player stream to `https://nhdapi.st/anime/16498/1?dub=1` and maintained active timestamp without page navigation.
3. **Desktop DUB → SUB Hot-Switch**: Click on `[ SUB ]` resumed original subtitled stream near the same timestamp.
4. **Mobile Single-Tap Response**: Verified on viewport 390x844 with touch events.
5. **Admin Diagnostics Lab**: Live verification at `/admin/playback-lab/anime` passed the end-to-end hot switch test.
6. **Production Smoke QA**: Verified live on `https://streaming-chi-red.vercel.app` across homepage, search API, anime SUB/DUB switching, movie playback, and TV playback.
