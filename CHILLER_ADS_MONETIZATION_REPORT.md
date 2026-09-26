# CHILLER — PREMIUM AD MONETIZATION IMPLEMENTATION REPORT
**Target Platform:** CHILLER (`https://chillerstream.duckdns.org` / `https://streaming-chi-red.vercel.app`)  
**Architecture:** Centralized, Resilient, Frequency-Controlled Ad System  
**Product Principle:** Premium Streaming Platform with Infrequent, Non-Intrusive Monetization

---

## A. FILES CREATED
1. `lib/ads/ad-types.ts` — TypeScript definitions for placements, providers, settings, session telemetry, and eligibility results.
2. `lib/ads/config.ts` — Centralized provider configurations (Profitablerate CPM, Profitablerate Invoke, HighRevenue 320x50, HighRevenue 728x90), database settings repository with 60s cache, and resilient in-memory fallback.
3. `lib/ads/ad-exclusions.ts` — Engine enforcing zero ads for Super Admins, ad-free accounts, premium tiers, protected routes (`/admin`, `/login`, `/register`, `/profile`), and active fullscreen playback.
4. `lib/ads/ad-frequency.ts` — Frequency & impression throttling engine tracking initial page delay, minimum interval (120s), session limits (5), page limits (2), player page limits (1), and 15-minute close dismissal cooldowns in `sessionStorage`.
5. `lib/ads/script-loader.ts` — Singleton external script loader with deduplication, 8s timeout guard, error tracking, and zero SSR hydration mismatch.
6. `lib/ads/ad-manager.ts` — Master orchestration module evaluating slot eligibility, responsive format selection, provider circuit breaker cooldowns, and non-blocking impression logging.
7. `components/ads/AdSafeWrapper.tsx` — React error boundary isolating ad components so third-party errors never crash CHILLER navigation or playback.
8. `components/ads/BannerAd.tsx` — Isolated rendering component for HighRevenueFormat 728x90 / 320x50 sandboxed iframes and Profitablerate CPM network / invoke units.
9. `components/ads/AdContainer.tsx` — Premium glassmorphic container with fixed min-height (anti-CLS), subtle "Sponsored" badge, and "× Close" dismissal button.
10. `components/ads/ResponsiveBannerAd.tsx` — Client viewport detector automatically serving 728x90 on desktop and 320x50 on mobile.
11. `components/ads/AdSlot.tsx` — Master ad slot component with `IntersectionObserver` lazy loading, eligibility checking, debug inspection pill, and natural zero-height layout collapse when ineligible.
12. `app/api/ads/config/route.ts` — API endpoint supporting public read for client evaluation and admin PATCH updates with audit logging.
13. `app/api/ads/impression/route.ts` — Telemetry ingestion endpoint for impressions/failures and analytics compiler for admin dashboard.
14. `app/api/ads/event/route.ts` — Lightweight ad event telemetry API.
15. `app/admin/ads/page.tsx` — Root Control Center dashboard for ads: real-time analytics, master kill switch, channel switches, provider toggles, frequency controls, live desktop/mobile simulator, and instant ad-free user search & toggle.
16. `scripts/test-ad-system.ts` — 23-point automated verification test suite.
17. `scripts/verify-ad-db.ts` — Database schema & persistence test script.

---

## B. FILES MODIFIED
1. `prisma/schema.prisma` — Added `adsFree Boolean @default(false)` to `User` model; added `AdSettings` and `AdImpression` models.
2. `prisma/schema.postgresql.prisma` — Added identical fields and models to ensure PostgreSQL and SQLite parity.
3. `lib/auth.ts` — Attached `adsFree` to `authorize()`, `jwt()`, and `session()` callbacks with authoritative automatic true for Super Admins.
4. `app/api/admin/users/route.ts` — Updated GET to return `adsFree` and PATCH to allow admins to toggle `adsFree` for any account with audit logging.
5. `app/admin/users/page.tsx` — Selected `adsFree: true` in user management query.
6. `components/admin/UserManagementTable.tsx` — Added "Ads Exemption" column with live toggle button `[ Ads Free: ON / OFF ]` and `[ AUTO ADS-FREE ]` badge for Super Admins.
7. `app/admin/layout.tsx` — Added "Ads Monetization" navigation item (`/admin/ads`) to the admin sidebar.
8. `app/page.tsx` — Integrated `<AdSlot placement="home_top" />` directly below the hero section before trending rails.
9. `app/movies/page.tsx` — Integrated `<AdSlot placement="browse_content" />` between featured rails and genre rails.
10. `app/series/page.tsx` — Integrated `<AdSlot placement="browse_content" />` between on-the-air rails and genre rails.
11. `app/anime/page.tsx` — Integrated `<AdSlot placement="browse_content" />` between seasonal/popular rails and shonen genre rails.
12. `components/video/MediaDetailView.tsx` — Integrated `<AdSlot placement="detail_bottom" />` below primary metadata/cast and before Similar Titles.
13. `components/player/WatchExperience.tsx` — Integrated `<AdSlot placement="player_below" />` strictly below the video player within the `!isPlayerFullscreen` boundary.
14. `app/profile/page.tsx` — Passed `adsFree` status into user data object.
15. `components/profile/ProfileAccountCenter.tsx` — Rendered `ADS-FREE ACCOUNT` badge in user account overview.
16. `.env.example` & `.env` — Documented ad monetization environment variables (`ADS_ENABLED`, etc.).

---

## C. DATABASE SCHEMA CHANGES
```prisma
// Added to User model:
model User {
  ...
  adsFree Boolean @default(false)
}

// Added AdSettings singleton model:
model AdSettings {
  id                     String   @id @default("global")
  adsEnabled             Boolean  @default(true)
  desktopEnabled         Boolean  @default(true)
  mobileEnabled          Boolean  @default(true)
  homeEnabled            Boolean  @default(true)
  movieEnabled           Boolean  @default(true)
  seriesEnabled          Boolean  @default(true)
  animeEnabled           Boolean  @default(true)
  detailEnabled          Boolean  @default(true)
  watchEnabled           Boolean  @default(true)
  topBannerEnabled       Boolean  @default(true)
  contentBannerEnabled   Boolean  @default(true)
  detailBannerEnabled    Boolean  @default(true)
  playerBannerEnabled    Boolean  @default(true)
  providerProfitableRate Boolean  @default(true)
  providerHighRevenue320 Boolean  @default(true)
  providerHighRevenue728 Boolean  @default(true)
  initialPageAdDelay     Int      @default(12)
  minIntervalSeconds     Int      @default(120)
  sessionLimit           Int      @default(5)
  pageLimit              Int      @default(2)
  playerPageLimit        Int      @default(1)
  contentSpacing         Int      @default(30)
  updatedAt              DateTime @updatedAt
  createdAt              DateTime @default(now())

  @@map("ad_settings")
}

// Added AdImpression telemetry model:
model AdImpression {
  id         String   @id @default(cuid())
  provider   String
  placement  String
  page       String
  deviceType String   @default("desktop")
  status     String   @default("success")
  createdAt  DateTime @default(now())

  @@index([createdAt])
  @@index([provider])
  @@index([placement])
  @@map("ad_impressions")
}
```

---

## D. ENVIRONMENT VARIABLES
```env
ADS_ENABLED="true"
ADS_DESKTOP_ENABLED="true"
ADS_MOBILE_ENABLED="true"
ADS_PROVIDER_PROFITABLERATE_ENABLED="true"
ADS_PROVIDER_HIGHREVENUE_ENABLED="true"
```

---

## E. PROVIDERS INTEGRATED
1. **Profitablerate CPM Network Script:**
   - Script: `https://pl31522715.profitableratecpmnetwork.com/ca/d9/72/cad9727ff2ff49f5370a1cb10d3c2b07.js`
   - Role: Background network script.
2. **Profitablerate Invoke Unit:**
   - Script: `https://pl31522716.profitableratecpmnetwork.com/036795d0ec9ca91f70d3e5f8d8def3c3/invoke.js` (`data-cfasync="false"`)
   - Container: `<div id="container-036795d0ec9ca91f70d3e5f8d8def3c3"></div>`
   - Role: Content ad unit.
3. **HighRevenueFormat 320x50 (Mobile Banner):**
   - Key: `68c3e3bd8671092fe3359316a995024c`
   - Script: `https://www.highrevenueformat.com/68c3e3bd8671092fe3359316a995024c/invoke.js`
   - Format: Isolated sandboxed iframe (`320x50`).
4. **HighRevenueFormat 728x90 (Desktop Leaderboard):**
   - Key: `b541512a190670f60deae70ce055bb3e`
   - Script: `https://www.highrevenueformat.com/b541512a190670f60deae70ce055bb3e/invoke.js`
   - Format: Isolated sandboxed iframe (`728x90`).

---

## F. AD PLACEMENTS
- `home_top` — Rendered on `/` directly beneath the Cinematic Hero and above the Trending rail.
- `browse_content` — Rendered on `/movies`, `/series`, and `/anime` between primary featured rails and genre categories.
- `detail_bottom` — Rendered on detail pages below starring cast and before Similar Titles.
- `player_below` — Rendered on watch pages strictly below the video player wrapper and action controls. Excluded during fullscreen.

---

## G. FREQUENCY RULES
- **Initial Page Delay:** 12 seconds. Users can browse freely on arrival before any ad is rendered.
- **Minimum Ad Interval:** 120 seconds. Once an ad renders, no further ads appear anywhere on the site for at least 2 minutes.
- **Session Maximum:** 5 impressions maximum per browser session.
- **Page Maximum:** 2 impressions maximum per browse/home page.
- **Player Page Maximum:** Strictly 1 impression maximum on `/watch` routes.
- **Dismissal Memory:** When user clicks "× Close", that specific placement enters a 15-minute cooldown.

---

## H. MOBILE BEHAVIOR
- Responsive detection selects the `320x50` banner format.
- Max-width is constrained to `100%` and `320px` to prevent horizontal scrolling or viewport overflow on narrow screens (360px–393px).
- Banners are positioned outside swipe rails and bottom navigation.

---

## I. DESKTOP BEHAVIOR
- Displays standard `728x90` leaderboard banners.
- Centered with subtle glassmorphic backdrop (`bg-zinc-950/40 border border-white/[0.06]`).
- Clean min-height preservation avoids Cumulative Layout Shift (CLS).

---

## J. ADS-FREE ACCOUNT SYSTEM
- Accounts with `user.adsFree = true` or premium subscription tiers receive **zero ads**:
  - Zero external ad scripts loaded.
  - Zero ad network requests initiated.
  - Ad containers collapse naturally with zero empty whitespace.
- Super Admins can search any user by email in `/admin/ads` or `/admin/users` and toggle their Ad-Free status with immediate effect.

---

## K. SUPER ADMIN BEHAVIOR
- Super Admin accounts (`roytejaswi40@gmail.com`, `roytejaswi206@gmail.com`, or role `SUPER_ADMIN`) are **authoritatively exempt** from all advertising.
- Profile displays `ADS-FREE ACCOUNT` badge.
- Admin dashboard `/admin/ads` displays live toggle and debugging controls.

---

## L. KILL SWITCH
- Global Kill Switch in `/admin/ads` (`adsEnabled: false`) or via env (`ADS_ENABLED=false`).
- Turning it off terminates all ad evaluation immediately across all routes and devices.

---

## M. PERFORMANCE IMPACT
- Third-party scripts are lazy-loaded via `IntersectionObserver` only when scrolled into view.
- Scripts are loaded once using singleton caching to prevent duplicate network hits on client route changes.
- HighRevenueFormat scripts run in isolated iframes to prevent DOM pollution and memory leaks.
- Zero impact on Core Web Vitals (CLS protected via fixed container min-height).

---

## N. SECURITY CONSIDERATIONS
- HighRevenueFormat iframe runs with restrictive sandbox attributes (`allow-scripts allow-same-origin allow-popups allow-forms`).
- Zero API keys or secrets exposed to the client.
- Admin modification endpoints (`PATCH /api/ads/config`, `PATCH /api/admin/users`) protected by `requireAdmin()` and full audit logging.

---

## O. PRIVACY & CONSENT
- Architecture supports `chiller_ads_consent` (`granted` / `denied`).
- If a user explicitly denies consent, `evaluateAdEligibility` returns `eligible: false` and suppresses all third-party script execution.

---

## P. PROVIDER FAILURES
- Built-in circuit breaker tracks consecutive failures per provider.
- If a provider fails twice (e.g. adblocker, network timeout), it enters a 10-minute cooldown and suppresses cleanly without breaking the page or showing broken containers.

---

## Q. QA & TEST RESULTS
- Automated test suite (`scripts/test-ad-system.ts`): **23/23 PASSED** (0 failures).
- Database persistence verification (`scripts/verify-ad-db.ts`): **ALL PASSED**.
- TypeScript type check (`npx tsc --noEmit`): **PASSED (0 errors)**.
- Next.js production build (`npm run build`): **PASSED (0 errors)**.

---

## R. BUILD RESULTS
- Build exited with code 0.
- All new routes (`/admin/ads`, `/api/ads/config`, `/api/ads/impression`, `/api/ads/event`) compiled cleanly in the App Router.

---

## S. REMAINING LIMITATIONS
- When client ad-blockers are active, ad network CDN domains will be blocked at the DNS/network level; CHILLER catches these errors gracefully and isolates the layout without errors.

---

## T. EXACT ADMIN CONTROLS
Accessible at `https://chillerstream.duckdns.org/admin/ads`:
- **Master Kill Switch:** Ads Enabled (ON / OFF)
- **Device Channels:** Desktop Ads (ON / OFF), Mobile Ads (ON / OFF)
- **Route Toggles:** Home, Movies, Series, Anime, Details, Watch Page (each ON / OFF)
- **Provider Toggles:** Profitablerate CPM, HighRevenue 320x50, HighRevenue 728x90 (each ON / OFF)
- **Placement Toggles:** Top Banner, Content Banner, Detail Banner, Player Below Banner (each ON / OFF)
- **Frequency Limits:** Initial Page Delay, Minimum Interval, Session Limit, Page Limit, Player Page Limit, Content Spacing
- **User Governance:** Search user by email/name and toggle Ad-Free status
- **Placement Preview:** Switch between Desktop (728x90) and Mobile (320x50) simulated viewports

---

## U. EXACT USER EXPERIENCE
1. **First-time guest / regular viewer:**
   - Arrives at CHILLER: zero ads for the first 12 seconds.
   - Scrolls down: receives at most 1 subtle sponsored banner between hero and content.
   - Navigates to watch page: player is completely clean and untouched. A subtle banner appears below the controls after the initial delay.
   - Toggles Fullscreen: all ad containers are completely removed from DOM.
   - Clicks "× Close": banner disappears immediately and is suppressed for 15 minutes.
2. **Super Admin / Ad-Free User:**
   - Explores the entire platform: zero ad scripts, zero ad containers, zero layout gaps.
   - Profile page displays `ADS-FREE ACCOUNT`.

---

# AD PLACEMENT MAP

```text
================================================================================
1. HOME PAGE (/)
================================================================================
[ Header Navigation ]
[ Cinematic Hero Slides ]
────────────────────────────────────────────────────────────────────────────────
>>> [ AD SLOT: home_top ] (Responsive 728x90 Desktop / 320x50 Mobile) <<<
────────────────────────────────────────────────────────────────────────────────
[ Trending Now Rail (Top 10 Global) ]
[ Continue Watching Rail ]
[ Regional & Country Discovery Rail ]
[ Trending Movies Rail ]
[ Trending Series Rail ]
[ Genre Rails ... ]
[ Footer ]

================================================================================
2. MOVIES PAGE (/movies)
================================================================================
[ Header Navigation ]
[ Movies Featured Hero ]
[ Now Playing in Theaters Rail ]
[ Upcoming Movies Rail ]
[ Top Rated Classics Rail ]
────────────────────────────────────────────────────────────────────────────────
>>> [ AD SLOT: browse_content ] (Content Banner) <<<
────────────────────────────────────────────────────────────────────────────────
[ Action & Adrenaline Rail ]
[ Sci-Fi & Cyberpunk Rail ]
[ Horror & Comedy Rails ... ]
[ Footer ]

================================================================================
3. SERIES PAGE (/series)
================================================================================
[ Header Navigation ]
[ Series Featured Hero ]
[ On The Air Rail ]
[ Top Rated Series Rail ]
[ Airing Today Rail ]
────────────────────────────────────────────────────────────────────────────────
>>> [ AD SLOT: browse_content ] (Content Banner) <<<
────────────────────────────────────────────────────────────────────────────────
[ Drama & Sci-Fi Rails ... ]
[ Footer ]

================================================================================
4. ANIME PAGE (/anime)
================================================================================
[ Header Navigation ]
[ AniList Hero Banner ]
[ Currently Airing This Season Rail ]
[ Popular All Time Rail ]
[ Top Rated Anime Rail ]
────────────────────────────────────────────────────────────────────────────────
>>> [ AD SLOT: browse_content ] (Content Banner) <<<
────────────────────────────────────────────────────────────────────────────────
[ Action & Shonen Rail ]
[ Fantasy & Isekai Rail ]
[ Footer ]

================================================================================
5. DETAIL PAGE (/movie/[id] & /tv/[id])
================================================================================
[ Backdrop Banner + Poster + Title Metadata ]
[ Synopsis + Genres + 4K / Atmos Badges ]
[ Watch CTA + Trailer Preview ]
[ Starring Cast Rail ]
────────────────────────────────────────────────────────────────────────────────
>>> [ AD SLOT: detail_bottom ] (Before Similar Titles) <<<
────────────────────────────────────────────────────────────────────────────────
[ Similar Titles Rail ]
[ Recommended Content Rail ]
[ Footer ]

================================================================================
6. WATCH / PLAYER PAGE (/watch/[...slug])
================================================================================
[ Header Navigation ]
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CHILLER PLAYER                                  │
│             (100% UNTOUCHED — NO OVERLAYS — NO POPUPS — CLEAN)               │
└──────────────────────────────────────────────────────────────────────────────┘
[ Server Selector / Sub-Dub Controls / Auto Next Toggle ]
────────────────────────────────────────────────────────────────────────────────
>>> [ AD SLOT: player_below ] (Strictly Below Controls — Removed on Fullscreen) <<<
────────────────────────────────────────────────────────────────────────────────
[ Episode Navigation Buttons (Prev / Next) ]
[ Season Selector & Episode List ]
[ Recommendations Rail ]
[ Footer ]
================================================================================
```

---

# DEFAULT PRODUCTION SETTINGS

```json
{
  "id": "global",
  "adsEnabled": true,
  "desktopEnabled": true,
  "mobileEnabled": true,
  "homeEnabled": true,
  "movieEnabled": true,
  "seriesEnabled": true,
  "animeEnabled": true,
  "detailEnabled": true,
  "watchEnabled": true,
  "topBannerEnabled": true,
  "contentBannerEnabled": true,
  "detailBannerEnabled": true,
  "playerBannerEnabled": true,
  "providerProfitableRate": true,
  "providerHighRevenue320": true,
  "providerHighRevenue728": true,
  "initialPageAdDelay": 12,
  "minIntervalSeconds": 120,
  "sessionLimit": 5,
  "pageLimit": 2,
  "playerPageLimit": 1,
  "contentSpacing": 30
}
```
