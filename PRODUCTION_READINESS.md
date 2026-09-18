# Velora Video Streaming Platform — Production Readiness Report

**Date**: September 7, 2026  
**Architecture Profile**: Free-First / Open-Source / Self-Hosted  
**Deployment Target**: Single Server to Multi-Origin Cluster (10,000+ Video Architecture)

---

## 1. VERIFIED WORKING

- **End-to-End Real Video Streaming Pipeline**:
  - Genuine MP4 file &rarr; Streaming SHA-256 Hash &rarr; FFprobe JSON Metadata Probe &rarr; FFmpeg Multi-Variant HLS Transcoding &rarr; Automated Stream Verification (`verifyHLSStream`) &rarr; Local Storage &rarr; Signed Playback Manifest &rarr; Custom Player & Embed Player.
  - Verified with real test video: `real-verified-stream-mtr7pn4o` with 3 adaptive renditions (720p, 480p, 360p &mdash; no upscaling).
- **HTTP 206 Partial Content & Byte-Range Requests**:
  - `/api/storage/[...path]` delivers video segments with verified `206 Partial Content`, `Accept-Ranges: bytes`, and `Content-Range: bytes 0-1024/1063140`.
- **Custom Player & 10s Skip Controls**:
  - HTML5/HLS player with `↶ 10s` and `10s ↷` buttons, keyboard shortcuts (`Space`, `J`, `L`, `F`, `M`), adaptive quality switching, speed selection, and Picture-in-Picture.
- **Standalone Embed Player**:
  - Responsive `/embed/[publicId]` route with zero outer page bloat, domain security allowlist filtering, and direct HLS streaming.
- **Database & Production Indexing**:
  - Verified 1,000-record scale benchmark: indexed slug lookups in **0.87ms**, deep pagination (OFFSET 480, LIMIT 24) in **4ms**.
  - Dual support: SQLite WAL mode for local zero-config, PostgreSQL 16 schema (`prisma/schema.postgresql.prisma`) for production.
- **Persistent Job Queue & Worker**:
  - Decoupled `worker.ts` standalone process (`npm run worker`) with atomic job locking, progress reporting, and error handling.
- **Security & Hygiene**:
  - Root `.gitignore` created to prevent accidental commits of media, WAL, or `.env` files.
  - `.env.example` sanitized with zero literal secrets.
  - HMAC-SHA256 signed playback tokens with short-lived expiration.
- **Nginx Reverse Proxy & Video Server**:
  - `nginx/nginx.conf` configured for direct static HLS streaming, immutable `.ts` caching, short `.m3u8` caching, and connection rate-limiting.
- **Docker Compose**:
  - Full-stack self-hosted `docker-compose.yml` (`web`, `worker`, `postgres`, `redis`, `nginx`).

---

## 2. PARTIALLY IMPLEMENTED

- **Batch Import Job Automation**:
  - `BatchImportManager` persists job state, item progress, and resume capabilities across restarts.
  - Folder-based batch ingestion is operational. Live Telegram API downloading requires user-supplied Telegram API credentials.
- **S3 / Cloudflare R2 Cloud Storage Adapter**:
  - Clean `StorageProvider` interface implemented. Local storage is fully functional; S3 adapter requires user-supplied bucket credentials when switching from `STORAGE_PROVIDER="local"` to `"s3"`.

---

## 3. MOCKED / SIMULATED

- **Zero Fake Data Policy**:
  - All fake server loads (18.5%, 24.0%, etc.) have been removed.
  - Unconfigured servers explicitly report `NOT_CONFIGURED`, latency `0ms`, and failure count `0`.
  - Monetization revenue displays `DATA NOT CONNECTED` when no gateway is configured.

---

## 4. EXTERNAL SERVICES REQUIRED (At Enterprise Scale)

- **Unmetered Dedicated Bandwidth / VPS**: Required to serve > 50 simultaneous viewers without home internet bottlenecks.
- **PostgreSQL & Redis (Docker / Self-Hosted)**: Containerized in `docker-compose.yml` &mdash; 100% free and open source.
- **Telegram Bot / API Credentials**: Required only if scraping media directly from Telegram channels.
- **Payment Gateway (Stripe / CCBill)**: Required only if accepting credit card subscriptions.

---

## 5. ENVIRONMENT VARIABLES

Configured in `.env` (sanitized template in `.env.example`):

```ini
# Database
DATABASE_URL="file:./prisma/dev.db"

# Security
NEXTAUTH_SECRET="<32_CHAR_RANDOM_SECRET>"
NEXTAUTH_URL="http://localhost:3000"
STREAMING_SIGNING_SECRET="<32_CHAR_RANDOM_SECRET>"

# Storage (Free-First Local Disk)
STORAGE_PROVIDER="local"
LOCAL_STORAGE_PATH="./media_storage"
KEEP_ORIGINAL_FILES="true"

# Embed Security
ALLOWED_EMBED_DOMAINS="*"

# Worker & Queue
REDIS_URL="redis://localhost:6379"
WORKER_CONCURRENCY="2"
```

---

## 6. DATABASE

- **Active Development**: SQLite WAL Mode (`prisma/dev.db`).
- **Production Target**: PostgreSQL 16 (`prisma/schema.postgresql.prisma`).
- **Indexes**: `Video.slug`, `Video.publicId`, `Video.status`, `Video.isPublished`, `Video.createdAt`, `Video.views`, `Video.categoryId`, `WatchHistory.userId`, `WatchHistory.videoId`, `ViewEvent.videoId`, `ProcessingJob.status`, `StreamingServer.status`.

---

## 7. STORAGE

- **Root Directory**: `./media_storage` (outside Git and Next.js build).
- **Subdirectories**:
  - `videos/original/`: Raw uploaded source MP4 files.
  - `videos/hls/<videoId>/`: Master playlist, rendition playlists, and `.ts` segments.
  - `videos/thumbnails/<videoId>/`: Extracted video poster frames.
  - `videos/posters/<videoId>/`: High-resolution backdrop art.

---

## 8. VIDEO PROCESSING

- **Engine**: Local FFmpeg 8.1.2 + FFprobe.
- **Metadata Probe**: Native `ffprobe` JSON parsing for duration, resolution, codecs, and fps.
- **Ladder**: Source &ge; 1080p (1080p, 720p, 480p, 360p), Source &ge; 720p (720p, 480p, 360p), Source &lt; 720p (no upscaling).
- **Segmenting**: 4-second target duration `.ts` chunks with VOD index generation.
- **Verification**: `verifyHLSStream` audits master manifest, variant playlists, and all `.ts` chunk files before marking `READY`.

---

## 9. TELEGRAM IMPORT

- **Architecture**: Server-side download worker &rarr; SHA-256 chunked hashing &rarr; Duplicate detection &rarr; Background transcode worker.
- **Resumability**: Job states persisted in `media_storage/import_states/batch_<id>.json`.
- **Batch Controls**: `Pause`, `Resume`, `Retry Failed`, `Cancel`.

---

## 10. MULTI-ORIGIN

- **Monitoring Model**: Active HTTP ping probes via `/api/admin/servers/ping` measuring true round-trip latency.
- **States**: `ONLINE`, `OFFLINE`, `UNREACHABLE`, `NOT_CONFIGURED`.
- **Failover Chain**: Lowest latency verified origin &rarr; Secondary healthy origin &rarr; Local primary storage.

---

## 11. CDN

- **Status**: Optional. Defaults to direct origin streaming via Nginx.
- **Integration**: Prepend `NEXT_PUBLIC_CDN_BASE_URL` when an edge caching network (e.g. Cloudflare / CloudFront) is attached.

---

## 12. SECURITY

- Short-lived HMAC-SHA256 playback tokens with expiration.
- Domain allowlist validation for iframe embedding.
- Sanitized environment variables and `.gitignore` coverage.
- Server-side role and tier validation for premium titles.

---

## 13. MONETIZATION

- Modular `AdProvider` and `PaymentProvider` interfaces.
- Real database subscription counts with zero fabricated revenue.

---

## 14. DEPLOYMENT PROFILES

### Profile A: Local Development (Current Machine)
```powershell
# 1. Run migrations
npx prisma db push

# 2. Start standalone transcode worker
npm run worker

# 3. Start web server
npm run dev # or npm run start
```

### Profile B: Self-Hosted Production (Docker)
```bash
docker compose up -d
```

---

## 15. TEST RESULTS

| Test | Tool / Command | Result |
|---|---|---|
| **TypeScript Compilation** | `npx tsc --noEmit` | **0 errors** |
| **Next.js Production Build** | `npm run build` | **40 routes compiled successfully** |
| **Database Scale Test** | `npm run test:scale` | **0.87ms lookups, 4ms pagination** |
| **Health Micro-Endpoints** | `GET /api/health/*` | **DB: UP, Storage: UP, Queue: UP** |
| **End-to-End Real Video** | `scripts/test-single-video.ts` | **720p/480p/360p HLS generated & verified** |
| **Range Requests** | `Range: bytes=0-1024` | **HTTP 206 Partial Content verified** |
| **Browser Watch Page** | Headless Chrome | **Video canvas & 10s controls mounted** |
| **Browser Embed Player** | Headless Chrome | **Standalone iframe stream mounted** |

---

## 16. REMAINING RISKS & ADVICE FOR 10,000+ SCALE

1. **Disk Capacity**: Ensure the drive mounted to `./media_storage` has at least 5TB free space for 10,000 videos.
2. **CPU Utilization during Transcoding**: FFmpeg uses significant CPU. In `worker.ts`, keep `WORKER_CONCURRENCY="2"` on desktop CPUs so the machine remains responsive.
3. **Upload Bandwidth**: When streaming to public users without a CDN, a home connection can only support ~30-50 simultaneous 1080p viewers. Move to an unmetered 1 Gbps dedicated VPS ($40-60/mo) when traffic scales.
