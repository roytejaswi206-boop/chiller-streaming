# 🎬 CHILLER

### JUST CHILL.

> **GOOD STORIES. BETTER DAYS.**

A modern, full-stack entertainment discovery and streaming platform designed to bring **Movies, TV Series, Anime, Documentaries and more** into one cinematic experience.

CHILLER is built as a scalable OTT-style web platform with a strong focus on:

- 🎬 Content discovery
- 🔎 Powerful search
- 📺 Movies & TV series
- 🎌 Anime discovery
- ▶️ Multi-provider playback
- 🔄 Smart playback fallback
- ⏯️ Continue Watching
- 🌍 Multi-language audio & subtitles
- 👤 User accounts
- 🔐 Secure authentication
- 🛡️ Role-based administration
- 📊 Playback telemetry
- ⚡ Caching & performance
- 💰 Monetization-ready architecture
- 📱 Responsive cinematic UI

---

## 🌐 Live Demo

### 🚀 CHILLER

**Live Website:**  
https://streaming-chi-red.vercel.app/

**GitHub Repository:**  
https://github.com/roytejaswi206-boop/chiller-streaming

---

# ✨ What is CHILLER?

CHILLER is a next-generation entertainment platform concept that combines the experience of a modern OTT application with an API-first content discovery architecture.

Instead of relying on manually entered movie and series data, CHILLER is designed around **metadata aggregation and provider abstraction**.

The platform can discover content through services such as:

- TMDB
- AniList
- Jikan
- TVmaze
- Other optional metadata providers

Playback is handled through a separate **provider orchestration layer**, allowing multiple playback providers to coexist without coupling the entire application to a single source.

The result is an architecture that can evolve from a simple streaming interface into a much larger entertainment ecosystem.

---

# 🎯 Vision

The long-term vision of CHILLER is simple:

> **One place to discover great stories.**

Movies, series, anime, documentaries and other entertainment should feel like part of one unified experience rather than disconnected services.

CHILLER aims to provide:

```text
Discover
   ↓
Explore
   ↓
Choose
   ↓
Watch
   ↓
Resume
   ↓
Continue Exploring
```

Everything is designed around keeping the user inside a smooth cinematic experience.

---

# 🎨 Brand Identity

## Name

**CHILLER**

## Tagline

> JUST CHILL.

## Secondary tagline

> GOOD STORIES. BETTER DAYS.

## Primary Color

```text
#FF3B6B
```

## Secondary Color

```text
#8A5CFF
```

## Background

```text
#0F172A
```

## Deep Background

```text
#09090C
```

## Primary Text

```text
#F8FAFC
```

The visual direction combines:

- Dark cinematic surfaces
- Pink / violet accents
- Large media artwork
- Smooth motion
- Glass-like UI surfaces
- Strong typography
- OTT-style content rails
- Immersive player experience

---

# 🚀 Core Features

## 🎬 Content Discovery

CHILLER provides a unified discovery experience across multiple entertainment categories.

### Supported discovery categories

- Movies
- TV Series
- Anime
- Documentaries
- Trending content
- Popular content
- Top-rated content
- New releases
- Upcoming titles
- Recommended content
- Genre collections
- K-Drama
- C-Drama
- Kids content
- Search results

---

# 🔎 Advanced Search

The search system is designed to search across multiple content sources.

Users can discover:

- Movies
- Series
- Anime
- People
- Genres
- Related titles

The discovery architecture supports provider fallback and deduplication so that the same title does not unnecessarily appear multiple times.

---

# 🏠 Dynamic Home Page

The CHILLER homepage is built around a cinematic content discovery system.

Typical homepage sections include:

```text
Hero
↓
Continue Watching
↓
Trending
↓
Trending Movies
↓
Trending Series
↓
Trending Anime
↓
Popular
↓
New Releases
↓
Recently Added
↓
Top Rated
↓
Genres
↓
K-Drama
↓
C-Drama
↓
Kids
↓
Documentaries
↓
Upcoming
↓
Recommended
```

Content can be dynamically populated from connected metadata providers.

---

# 🖼️ Rich Media Pages

Every title can have a dedicated detail experience containing information such as:

- Poster
- Backdrop
- Title
- Original title
- Description
- Release date
- Runtime
- Genres
- Rating
- Cast
- Crew
- Related content
- Similar titles
- Recommendations
- Seasons
- Episodes
- Available playback sources

The goal is to make each title feel like a complete content page rather than a simple database entry.

---

# 🎌 Anime Engine

Anime is treated as a dedicated content category rather than simply another movie/TV filter.

### Primary anime metadata

**AniList**

### Anime fallback

**Jikan / MyAnimeList ecosystem**

The architecture supports:

- Anime discovery
- Anime search
- Anime metadata
- Episode information
- Season information
- Related anime
- Sequels
- Prequels
- Recommendations
- Anime-specific playback mapping

---

# 📺 TV Series

CHILLER supports TV-series navigation through:

```text
Series
   ↓
Season
   ↓
Episode
   ↓
Playback
```

The player architecture is designed to understand:

```text
media
season
episode
provider
source
progress
```

This allows Continue Watching to remain episode-specific instead of treating an entire series as one item.

---

# ▶️ Playback Architecture

One of the most important architectural concepts in CHILLER is the separation between:

```text
CONTENT DISCOVERY
        +
PLAYBACK
```

Metadata providers and playback providers are not tightly coupled.

---

# 🧠 Playback Orchestrator

CHILLER uses a provider abstraction layer.

Conceptually:

```text
                CHILLER PLAYER
                      │
                      ▼
             PLAYBACK ORCHESTRATOR
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
   Provider A     Provider B     Provider C
       │              │              │
       ▼              ▼              ▼
    Source         Source         Source
```

This allows CHILLER to select compatible playback sources without rebuilding the player for every provider.

---

# 🔄 Smart Provider Fallback

If multiple compatible providers are configured, CHILLER can attempt them according to provider health and compatibility.

Example:

```text
Provider A
   ↓
Timeout / Failure
   ↓
Provider B
   ↓
Unavailable
   ↓
Provider C
   ↓
Playback
```

The system is designed around:

- Provider compatibility
- Timeout protection
- Health tracking
- Circuit breakers
- Rate-limit protection
- Fallback attempts
- Request deduplication
- Provider-specific capabilities

---

# 🏥 Provider Health System

A provider can have statuses such as:

```text
NOT CONFIGURED
CONFIGURED
HEALTHY
DEGRADED
RATE LIMITED
AUTH ERROR
TIMEOUT
DISABLED
UNSUPPORTED
```

This allows the platform to distinguish between:

> "The API responded"

and:

> "The video actually played."

These are not the same thing.

---

# 🧪 Playback Verification

CHILLER's playback architecture recognizes multiple stages:

```text
API Response
      ≠
Iframe Loaded
      ≠
Source Resolved
      ≠
Player Ready
      ≠
Playback Started
      =
Actual Playback Success
```

A provider should ideally be considered successful only after playback has actually started and the playback position advances.

---

# 🎥 CHILLER Player

The player is designed as a centralized CHILLER-owned shell around compatible playback providers.

Conceptually:

```text
PlayerShell
│
├── PlayerViewport
│
├── ProviderRenderer
│
├── TopChrome
│
├── CenterChrome
│
└── BottomChrome
```

This allows the interface to remain consistent even when different playback providers are used underneath.

---

# 🧼 Cinema Mode

CHILLER uses an auto-hiding player interface.

During active playback:

```text
User stops interacting
        ↓
Controls fade away
        ↓
Clean cinema experience
```

When the user interacts:

```text
Tap / Click / Mouse movement
        ↓
Controls appear
        ↓
User interaction
        ↓
Controls fade after inactivity
```

Controls remain visible when:

- Video is paused
- Settings are open
- Error is displayed
- User is interacting
- Keyboard focus is active

---

# 🎛️ Player Controls

Depending on provider capabilities, CHILLER can expose:

- Play / Pause
- Seek
- Volume
- Fullscreen
- Rotate
- Quality
- Playback speed
- Audio language
- Subtitles
- Picture-in-picture
- Next episode
- Autoplay
- Progress
- Resume

Unsupported capabilities are not presented as fake controls.

---

# 🌍 Multi-Language Audio

CHILLER is designed to distinguish between:

```text
Audio Language
        ≠
Subtitle Language
        ≠
Original Language Metadata
```

If a provider exposes actual audio tracks, CHILLER can present available tracks such as:

```text
English
Hindi
Japanese
Korean
Spanish
...
```

Only actual available audio tracks should be displayed.

The system must not convert metadata language information into fake audio options.

---

# 💬 Subtitles

Subtitles are handled independently from audio.

Example:

```text
Audio:
English

Subtitles:
English
Hindi
Japanese
Spanish
Off
```

Only supported subtitle options should appear.

---

# ⏯️ Continue Watching

CHILLER supports resume-based viewing.

Example:

```text
Movie
1h 58m
Resume at 47:32
```

For TV:

```text
One Piece
Season 1
Episode 12
Resume at 08:21
```

Progress is associated with the correct media identity.

---

# 🧠 Resume Lifecycle

Resume is not simply:

```text
Load page → seek
```

Instead:

```text
Load saved progress
        ↓
Initialize player
        ↓
Player ready
        ↓
Duration available
        ↓
Validate saved position
        ↓
Apply seek
        ↓
Resume playback
```

A `resumeApplied` guard can prevent race conditions caused by asynchronous player initialization.

---

# 💾 Progress Saving

Playback progress can be saved periodically and during important lifecycle events.

Typical events include:

- Every ~10–15 seconds
- Pause
- Visibility change
- Page lifecycle events where reliable
- Episode changes
- Playback ended

For authenticated users, server-side progress can act as the canonical record.

For guests, local storage can be used.

When a guest signs in, progress can be merged into the account where appropriate.

---

# 🔐 Authentication

CHILLER includes an authentication architecture for user accounts.

Authentication is designed around secure server-side session handling rather than trusting client-side role information.

User accounts can eventually support:

- Continue Watching
- Watch history
- Watchlist
- Preferences
- Audio preference
- Subtitle preference
- Profile settings
- Personalized discovery

---

# 🛡️ Role-Based Access Control

CHILLER supports multiple roles:

```text
USER
ADMIN
MODERATOR
SUPER_ADMIN
```

The system separates normal administration from Super Admin privileges.

---

# 👑 Super Admin

The Super Admin system is designed around server-side authorization.

Super Admin access is controlled using authorized email identities and server-side checks.

Important security principles include:

- Database re-validation
- Server-side role checks
- Protected admin routes
- Protected API routes
- Bootstrap password flow
- Forced password change after bootstrap
- Audit logging
- Role escalation protection

Normal administrators cannot arbitrarily promote themselves to Super Admin.

---

# 🧾 Audit Logging

Important administrative operations can be recorded for accountability.

Examples include:

- User creation
- Role changes
- Security changes
- Administrative actions
- Configuration changes

Audit logging is intended to provide a traceable administrative history.

---

# ⚙️ Admin Dashboard

The platform architecture supports a dedicated administration layer.

Potential administrative areas include:

```text
/admin
/admin/users
/admin/providers
/admin/playback-lab
/admin/monetization
/admin/settings
```

---

# 🧪 Playback Lab

The Playback Lab is designed for testing providers without relying solely on production playback.

It can be used to inspect:

- Provider configuration
- Provider health
- Media compatibility
- Movie playback
- TV playback
- Episode playback
- Provider errors
- Timeouts
- Fallback behavior
- Player events

---

# 📊 Provider Capability System

Each playback provider can declare supported capabilities.

Example:

```text
supportsMovie
supportsTV
supportsEpisode
supportsAnime
supportsHLS
supportsMP4
supportsIframe
supportsSubtitles
supportsAudio
supportsQuality
supportsResume
supportsSeek
```

This prevents CHILLER from displaying controls or selecting providers for media they cannot actually handle.

---

# 🗺️ Provider ID Mapping

Different services may use different identifiers.

CHILLER therefore separates its canonical media identity from provider-specific IDs.

Conceptually:

```text
CHILLER MEDIA ID
        │
        ├── TMDB ID
        │
        ├── AniList ID
        │
        ├── Jikan ID
        │
        └── Provider-specific ID
```

This makes the architecture extensible.

---

# 🧩 Metadata Providers

## TMDB

Used primarily for:

- Movies
- TV series
- Trending content
- Genres
- Cast
- Crew
- Images
- Recommendations
- Similar titles
- Release information

---

## AniList

Used primarily for:

- Anime
- Anime metadata
- Characters
- Relations
- Seasons
- Recommendations
- Anime-specific discovery

---

## Jikan

Used as an optional anime fallback.

---

## TVmaze

Used as an optional TV enrichment source.

---

# 📰 News & Editorial Layer

CHILLER can also support entertainment news and editorial content through a dedicated news provider abstraction.

Possible content includes:

- Entertainment news
- Movie announcements
- Anime updates
- Release information
- Industry stories
- Featured articles

This layer is kept separate from core metadata and playback systems.

---

# ⚡ Performance Architecture

Performance is a major part of CHILLER's architecture.

The system is designed to use:

- API caching
- Request deduplication
- Lazy loading
- Infinite scrolling
- Pagination
- Provider health caching
- Timeouts
- Circuit breakers
- Server-side API access where appropriate
- Optimized image loading

---

# 🧠 Request Deduplication

If multiple components request the same resource at almost the same time, the architecture can avoid unnecessarily creating duplicate upstream requests.

Conceptually:

```text
Component A ─┐
Component B ─┼──> Same Request ──> Provider
Component C ─┘
```

Instead of:

```text
A → Provider
B → Provider
C → Provider
```

---

# 🚦 Circuit Breaker

Provider failures can trigger circuit-breaker behavior.

Conceptually:

```text
CLOSED
  ↓
Repeated failures
  ↓
OPEN
  ↓
Cooldown
  ↓
HALF OPEN
  ↓
Successful test
  ↓
CLOSED
```

This prevents a failing provider from continuously slowing down the entire platform.

---

# 🗄️ Database

CHILLER uses a database architecture designed around:

- Users
- Authentication
- Roles
- Watch progress
- Watch history
- Preferences
- Provider configuration
- Application settings
- Audit records

### Production

PostgreSQL

### Local development

SQLite can be used where appropriate.

### ORM

Prisma

---

# 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js |
| Language | TypeScript |
| Frontend | React |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| Local Database | SQLite |
| ORM | Prisma |
| Authentication | NextAuth |
| Video Processing | FFmpeg / FFprobe |
| Queue | BullMQ |
| Cache | Redis |
| Streaming | HLS |
| Deployment | Vercel / compatible infrastructure |
| Metadata | TMDB / AniList / Jikan / TVmaze |
| Version Control | Git + GitHub |

---

# 🏗️ High-Level Architecture

```text
                         ┌─────────────────────┐
                         │      CHILLER        │
                         │     Web Client      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Next.js App      │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
        ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
        │   Discovery    │ │ Authentication │ │    Playback    │
        │     Engine     │ │   & Accounts   │ │  Orchestrator  │
        └───────┬────────┘ └───────┬────────┘ └───────┬────────┘
                │                  │                  │
                ▼                  ▼                  ▼
        ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
        │ TMDB         │    │ PostgreSQL   │   │ Provider A   │
        │ AniList      │    │ Prisma       │   │ Provider B   │
        │ Jikan        │    │ NextAuth     │   │ Provider C   │
        │ TVmaze       │    │              │   │ Provider ... │
        └──────────────┘    └──────────────┘   └──────────────┘
```

---

# 🔌 Provider Abstraction

The platform is intentionally designed so that a new provider can be integrated through an adapter instead of rewriting the whole application.

Conceptually:

```text
PlaybackProvider
│
├── getMovieSource()
├── getTVSource()
├── getEpisodeSource()
├── checkHealth()
├── getCapabilities()
└── getPlaybackMetadata()
```

This makes future provider integrations much easier.

---

# 📡 Playback Providers

CHILLER's architecture supports configurable playback provider slots.

Potential integrations can include compatible:

- HLS providers
- MP4 providers
- Iframe providers
- Self-hosted origins
- Authorized streaming services
- Private media servers
- Custom playback APIs

Providers are disabled by default until their required configuration is supplied.

---

# 🔒 Security

Security is treated as a first-class architectural concern.

Important principles include:

- Server-side authentication checks
- Server-side role validation
- Environment-based secrets
- No secrets committed to Git
- Protected administrative APIs
- Protected admin pages
- Provider allowlists
- CSP configuration
- Secure playback configuration
- Audit logging
- Rate-limit protection
- Circuit breakers
- Request timeouts

---

# 🌐 Iframe & Provider Safety

Third-party iframe playback can behave differently from native CHILLER playback.

The architecture therefore aims to use:

- Sandboxed iframes where compatible
- Provider origin allowlists
- CSP `frame-src` restrictions
- Restricted navigation permissions
- Safe embed policies
- Provider-specific configuration

The system does not assume that every provider supports the same browser capabilities.

---

# 📱 Responsive Design

CHILLER is designed for:

- 📱 Mobile
- 📱 Tablets
- 💻 Laptops
- 🖥️ Desktop
- 📺 Large displays

The interface adapts its:

- Navigation
- Content rails
- Cards
- Player controls
- Settings menus
- Typography
- Spacing
- Fullscreen behavior

to the available viewport.

---

# 🔄 Rotation & Fullscreen

The player architecture supports a dedicated rotation/fullscreen experience.

When supported by the browser:

```text
Fullscreen
      ↓
Landscape Orientation Lock
      ↓
Cinema Player
```

When orientation locking is unavailable, the application can gracefully fall back to fullscreen and provide a device rotation hint.

---

# 💰 Monetization Architecture

CHILLER is designed to eventually support multiple monetization models.

Possible revenue channels include:

### Display Advertising

Possible placements:

- Homepage
- Search
- Detail pages
- Editorial/news pages
- Discovery pages

---

### Video Advertising

Video advertisements should only be integrated where CHILLER has the necessary playback control and authorization.

Potential architecture:

```text
CHILLER Controlled Player
        ↓
Authorized Ad System
        ↓
Pre-roll / Mid-roll / Post-roll
        ↓
Content Playback
```

CHILLER should not attempt to inject its own advertising layer into an arbitrary third-party player where the platform does not control or have permission to modify that playback environment.

---

### Sponsorships

Possible sponsored surfaces:

- Featured collections
- Homepage placements
- Brand campaigns
- Entertainment partnerships

---

### Affiliate Revenue

Potential integrations could include:

- Merchandise
- Books
- Movie products
- Anime products
- Entertainment services
- Legal streaming services

---

### Premium Membership

A future CHILLER premium tier could potentially provide:

- Enhanced personalization
- Additional account features
- Advanced preferences
- Premium UI features
- Reduced first-party advertising where applicable

Premium benefits must not falsely promise removal of advertisements controlled by third-party playback providers.

---

# 📊 Monetization Dashboard

A future administration dashboard can track:

```text
Revenue
Impressions
Clicks
CTR
RPM
Campaigns
Ad Inventory
Affiliate Revenue
Sponsorships
Premium Users
```

---

# 📈 Analytics

CHILLER can eventually track privacy-conscious product analytics such as:

- Content views
- Search activity
- Playback starts
- Playback completion
- Resume usage
- Provider success rate
- Provider failure rate
- Average watch duration
- Popular genres
- Popular titles
- Search trends
- Conversion events

Analytics should be implemented with appropriate privacy controls.

---

# 🧱 Environment Configuration

CHILLER uses environment variables for external services and sensitive configuration.

Example structure:

```env
# ==============================
# SUPER ADMIN
# ==============================

SUPER_ADMIN_EMAILS=
SUPER_ADMIN_BOOTSTRAP_PASSWORD=

# ==============================
# METADATA
# ==============================

TMDB_ENABLED=true
TMDB_API_KEY=
TMDB_ACCESS_TOKEN=

ANILIST_ENABLED=true
ANILIST_API_URL=https://graphql.anilist.co

JIKAN_ENABLED=true
JIKAN_API_URL=https://api.jikan.moe/v4

TVMAZE_ENABLED=true
TVMAZE_API_URL=https://api.tvmaze.com

# ==============================
# OPTIONAL METADATA
# ==============================

THETVDB_ENABLED=false
THETVDB_API_URL=
THETVDB_API_KEY=

WATCHMODE_ENABLED=false
WATCHMODE_API_URL=
WATCHMODE_API_KEY=

OPENSUBTITLES_ENABLED=false
OPENSUBTITLES_API_URL=
OPENSUBTITLES_API_KEY=
OPENSUBTITLES_USERNAME=
OPENSUBTITLES_PASSWORD=

# ==============================
# PLAYBACK
# ==============================

VIDSRC_ENABLED=false
VIDSRC_BASE_URL=

CINESRC_ENABLED=false
CINESRC_API_URL=

NHD_ENABLED=false
NHD_API_URL=
NHD_API_KEY=

CODESPECTER_ENABLED=false
CODESPECTER_API_URL=
CODESPECTER_API_KEY=

PLAYBACK_AGGREGATOR_ENABLED=false
PLAYBACK_AGGREGATOR_URL=

# ==============================
# PLAYBACK ORCHESTRATOR
# ==============================

PLAYBACK_AUTO_MODE=true
PLAYBACK_PROVIDER_TIMEOUT_MS=5000
PLAYBACK_MAX_FALLBACK_ATTEMPTS=5
PLAYBACK_START_GRACE_MS=8000

PLAYBACK_CIRCUIT_BREAKER_ENABLED=true
PLAYBACK_CIRCUIT_FAILURE_THRESHOLD=5
PLAYBACK_CIRCUIT_RESET_MS=60000

PLAYBACK_HEALTH_CACHE_TTL_MS=30000
PLAYBACK_REQUEST_DEDUPE=true
PLAYBACK_TELEMETRY_ENABLED=true

# ==============================
# CACHE / INFRASTRUCTURE
# ==============================

REDIS_URL=

# ==============================
# DATABASE
# ==============================

DATABASE_URL=
```

> **Never commit real API keys, tokens, passwords, database credentials, or private provider credentials to GitHub.**

---

# 🚀 Local Development

## 1. Clone the repository

```bash
git clone https://github.com/roytejaswi206-boop/chiller-streaming.git
```

## 2. Enter the project

```bash
cd chiller-streaming
```

## 3. Install dependencies

```bash
npm install
```

## 4. Configure environment variables

Create:

```text
.env.local
```

and add the required configuration.

---

## 5. Configure the database

Run the required Prisma commands for your environment.

Example:

```bash
npx prisma generate
```

For development migrations:

```bash
npx prisma migrate dev
```

---

## 6. Start development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

# 🏭 Production Deployment

CHILLER can be deployed using modern cloud infrastructure.

The current public deployment is available through Vercel:

**https://streaming-chi-red.vercel.app/**

Production architecture can be expanded with:

```text
Vercel
   +
PostgreSQL
   +
Redis
   +
Background Workers
   +
Storage / Origins
   +
External APIs
```

---

# 🧵 Background Processing

For processing-heavy workflows, CHILLER's architecture can use:

```text
Redis
  ↓
BullMQ
  ↓
Worker
  ↓
FFmpeg / FFprobe
  ↓
HLS / Media Processing
```

This allows long-running jobs to remain separate from the main web application.

---

# 🎞️ Media Processing

For self-controlled media workflows, FFmpeg / FFprobe can be used for:

- Media inspection
- Transcoding
- HLS generation
- Audio processing
- Subtitle processing
- Resolution generation
- Media metadata extraction

A typical adaptive streaming pipeline can look like:

```text
Source Media
     ↓
FFprobe
     ↓
Media Analysis
     ↓
FFmpeg
     ↓
Multiple Resolutions
     ↓
HLS
     ↓
Storage / Origin
     ↓
CHILLER Player
```

---

# 📦 HLS Architecture

Adaptive streaming can provide multiple quality levels.

Example:

```text
1080p
720p
480p
360p
```

The player can select an appropriate quality depending on:

- Device
- Network
- Player support
- Provider capabilities

---

# 🗂️ Suggested Project Structure

A high-level structure can look like:

```text
chiller-streaming/
│
├── app/
│   ├── admin/
│   ├── api/
│   ├── anime/
│   ├── movies/
│   ├── series/
│   ├── search/
│   ├── trending/
│   ├── watch/
│   └── ...
│
├── components/
│   ├── player/
│   ├── media/
│   ├── discovery/
│   ├── navigation/
│   ├── admin/
│   └── ui/
│
├── lib/
│   ├── auth/
│   ├── security/
│   ├── discovery/
│   ├── playback/
│   ├── providers/
│   ├── cache/
│   ├── analytics/
│   └── ...
│
├── prisma/
│   └── schema.prisma
│
├── public/
│
├── scripts/
│
├── workers/
│
├── .env.example
├── package.json
├── next.config.*
├── tailwind.config.*
└── README.md
```

---

# 🧠 Design Principles

CHILLER follows several important engineering principles.

## 1. API First

Content should not be hardcoded unnecessarily.

```text
Provider
   ↓
API
   ↓
Normalization
   ↓
CHILLER
   ↓
UI
```

---

## 2. Provider Agnostic

The UI should not depend on a single provider.

```text
CHILLER
   ↓
Provider Abstraction
   ↓
Multiple Sources
```

---

## 3. Graceful Failure

A single provider failure should not automatically break the entire platform.

---

## 4. No Fake Capabilities

If a provider does not expose:

- Audio tracks
- Subtitles
- Seeking
- Quality selection
- Resume

CHILLER should not pretend that it does.

---

## 5. Security First

Secrets remain server-side.

Administrative operations require authorization.

---

## 6. Progressive Enhancement

The platform should provide the best possible experience based on actual browser and provider capabilities.

---

# 🧪 Testing Philosophy

CHILLER should be tested at multiple levels.

### API testing

Verify:

- Status codes
- Payloads
- Error handling
- Authentication
- Provider responses

### Browser testing

Verify:

- Navigation
- Search
- Detail pages
- Playback
- Resume
- Player controls
- Mobile UI
- Fullscreen
- Rotation

### Provider testing

Verify:

```text
Configured
   ↓
Reachable
   ↓
Compatible
   ↓
Player Ready
   ↓
Playback Started
   ↓
Playback Progressing
```

---

# 📱 Browser Compatibility

Target environments include:

- Chrome Desktop
- Chrome Android
- Edge
- Firefox
- Safari
- Safari iOS

Because browser support for fullscreen, orientation locking, iframe permissions and media APIs can differ, unsupported functionality should degrade gracefully.

---

# 🛣️ Roadmap

## Phase 1 • Foundation

- [x] CHILLER branding
- [x] Modern OTT-style UI
- [x] Next.js architecture
- [x] TypeScript
- [x] Tailwind
- [x] Database architecture
- [x] Authentication foundation

---

## Phase 2 • Discovery

- [x] TMDB integration
- [x] AniList integration
- [x] Anime discovery
- [x] Search
- [x] Trending
- [x] Popular
- [x] Genres
- [x] Content rails
- [x] Infinite loading architecture

---

## Phase 3 • Playback

- [x] Provider abstraction
- [x] Playback orchestrator
- [x] Provider capability system
- [x] Provider health architecture
- [x] Fallback architecture
- [x] Player shell
- [x] Resume architecture
- [x] Cinema-mode controls

---

## Phase 4 • User Experience

- [x] Continue Watching
- [x] Responsive UI
- [x] Fullscreen
- [x] Rotation support
- [x] Audio preference architecture
- [x] Subtitle architecture
- [ ] Advanced personalization
- [ ] Improved recommendations

---

## Phase 5 • Administration

- [x] Admin authentication
- [x] RBAC
- [x] Super Admin
- [x] Audit logging
- [x] User management
- [x] Provider management
- [x] Playback Lab
- [ ] Advanced analytics dashboard
- [ ] Content management tools

---

## Phase 6 • Monetization

- [ ] Ad system
- [ ] Ad inventory
- [ ] Sponsorship management
- [ ] Affiliate system
- [ ] Premium membership
- [ ] Revenue analytics
- [ ] Campaign management

---

## Phase 7 • Scale

- [ ] Redis optimization
- [ ] Worker scaling
- [ ] Multi-origin architecture
- [ ] Advanced caching
- [ ] CDN strategy
- [ ] Automated provider health monitoring
- [ ] Distributed telemetry
- [ ] Advanced recommendation engine

---

# 💡 Future Possibilities

CHILLER can eventually evolve into a broader entertainment ecosystem.

Potential future features:

### 👤 Personalized Profiles

```text
Profile
   ↓
Watch History
   ↓
Preferences
   ↓
Recommendations
```

### 🤖 AI Recommendations

An AI layer could understand:

- Favorite genres
- Watch history
- Preferred languages
- Preferred actors
- Preferred studios
- Completion behavior

and generate personalized recommendations.

---

### 🧠 Natural Language Search

Future search could support queries such as:

```text
"Find me a dark mystery anime with a smart protagonist."

"Show me action movies under 2 hours."

"Give me something similar to Spider-Man."

"Find highly rated psychological anime."
```

---

### 👥 Multiple Profiles

A future account could support:

```text
Main Profile
Kids Profile
Anime Profile
Guest Profile
```

---

### 📺 Watch Together

A future watch-party system could support:

```text
Create Room
      ↓
Invite Friends
      ↓
Synchronized Playback
      ↓
Chat
      ↓
Watch Together
```

---

# ⚖️ Content & Legal Responsibility

CHILLER is designed as a technology platform and content-discovery architecture.

Metadata and media may originate from external services.

Users and operators are responsible for ensuring that the content, playback sources, distribution methods, advertising and other integrations they use are properly authorized and comply with applicable laws, licenses and provider terms.

CHILLER should only be used with content and services that the operator is legally permitted to access, display, distribute or embed.

Third-party providers may have their own:

- Terms of Service
- Copyright policies
- API restrictions
- Geographic restrictions
- Advertising rules
- Embedding requirements
- Licensing requirements

CHILLER does not override or bypass those restrictions.

---

# 🙏 Credits & Acknowledgements

CHILLER is built with the help of the modern open-source and developer ecosystem.

Special thanks to projects and services including:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Redis
- BullMQ
- FFmpeg
- TMDB
- AniList
- Jikan
- TVmaze
- Vercel
- GitHub
- The broader open-source community

---

# 👨‍💻 Developer

## Tejaswi Roy

**B.Tech CSE (AI & ML)**

Developer • Full-Stack Engineer • AI/ML Enthusiast • Product Builder

CHILLER is an ongoing personal project focused on exploring:

- Full-stack development
- Streaming architecture
- API aggregation
- Modern UI/UX
- Authentication
- Distributed systems
- Media processing
- AI-powered personalization
- Cloud deployment
- Product engineering

---

# 🌐 CHILLER Links

### 🚀 Live Application

https://streaming-chi-red.vercel.app/

### 💻 GitHub

https://github.com/roytejaswi206-boop/chiller-streaming

---

# ⭐ Project Status

**CHILLER is an actively evolving project.**

The platform is continuously being improved across:

```text
UI/UX
+
Discovery
+
Playback
+
Authentication
+
Security
+
Performance
+
Infrastructure
+
Monetization
+
Personalization
```

The goal is not simply to build another streaming website.

The goal is to build a **complete entertainment platform architecture**.

---

# 🎬 CHILLER

## JUST CHILL.

> **GOOD STORIES. BETTER DAYS.**

**Discover something. Press play. Just chill. 🍿**
