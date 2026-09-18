# Velora Streaming Platform - Infrastructure Cost & Scalability Analysis

**Objective**: Complete cost transparency for self-hosted vs cloud video streaming at scale (10 to 10,000+ videos).

---

## 1. Free Software & Open-Source Components ($0.00)

The core technology stack of Velora is built 100% on permissive open-source software with **zero recurring software license fees**:

| Component | Software | License | Cost |
|---|---|---|---|
| **Web Server & SSR** | Next.js 16 + React 19 | MIT | $0.00 |
| **Relational Database** | PostgreSQL 16 (or SQLite WAL) | PostgreSQL / Public Domain | $0.00 |
| **Job Queue & Cache** | Redis 7 + BullMQ | BSD-3-Clause / MIT | $0.00 |
| **Video Transcoding Engine** | FFmpeg 8.1 + FFprobe | LGPL / GPL | $0.00 |
| **Reverse Proxy & Video Server** | Nginx | 2-clause BSD | $0.00 |
| **Database ORM** | Prisma ORM | Apache-2.0 | $0.00 |
| **Player Client** | HLS.js | Apache-2.0 | $0.00 |

You can run this entire platform indefinitely on your own personal computer, home server, or dedicated server hardware with **zero SaaS subscriptions**.

---

## 2. Infrastructure Scaling Realities (10,000+ Videos)

While the software itself is 100% free, **hardware, bandwidth, and electricity cannot realistically be free at enterprise scale**.

### Media Storage Math for 10,000 Videos
- Average length per video: **15 minutes**
- Encoded multi-bitrate HLS package (1080p, 720p, 480p, 360p): **~500 MB per title**
- 10,000 Videos &times; 500 MB = **~5,000 GB (5 Terabytes)**
- With original raw files retained: **~10 Terabytes total disk**

### Bandwidth Delivery Math
- 1 Viewer watching 1 hour of 1080p stream: **~1.5 GB of egress data**
- 10,000 Daily Active Users watching 30 mins each: **~7,500 GB (7.5 TB) per day** &rarr; **225 TB per month**

---

## 3. Deployment Architecture Comparison

### Option A: 100% Self-Hosted / Home / Office Server (Free-First)
- **Setup**: Your own desktop or used server running Linux / Windows + Docker + 2 &times; 8TB SATA Hard Drives.
- **Monthly Software Cost**: **$0.00**
- **Monthly Cloud Ingress / Egress Cost**: **$0.00**
- **Unavoidable Costs**:
  - One-time hardware cost (e.g. 2 &times; 8TB HDDs: ~$200)
  - Home internet connection with sufficient upload speed (fiber 100-1000 Mbps)
  - Electricity consumption (~40-80 Watts continuous: ~$5-$15/month)
- **Scale Ceiling**: Limited by home internet upload bandwidth (e.g. 100 Mbps can serve ~30-50 concurrent 1080p streams simultaneously).

### Option B: Low-Cost Dedicated Server / Unmetered VPS
- **Setup**: Dedicated server (e.g. Hetzner, OVH) with 2 &times; 10TB HDD, 1 Gbps unmetered port.
- **Estimated Cost**: **~$45 - $80 / month**
- **Capacity**: Easily handles 500 to 1,000 concurrent viewers without per-gigabyte bandwidth overage charges.

### Option C: Commercial Hyperscalers (AWS / Google Cloud / Cloudflare)
- **S3 / R2 Storage**: 5 TB &times; $0.015/GB = **~$75 / month**
- **AWS CloudFront Bandwidth**: 225 TB &times; $0.08/GB = **~$18,000 / month (PROHIBITIVE WITHOUT CUSTOM ENTERPRISE CONTRACTS)**
- **Cloudflare Stream / Paid Video SaaS**: $5 per 1,000 mins streamed = **~$4,500 / month**

---

## 4. The Velora Free-First Verdict

1. **Start with Profile A (Self-Hosted / Local Disk)**:
   - Zero dollars spent. Use your own disk and CPU to transcode, store, and test the entire 10,000 catalog.
2. **Move to Profile B (Unmetered Dedicated Node) when traffic grows**:
   - Rent a fixed-price unmetered dedicated box ($50/mo) rather than per-gigabyte cloud bills.
3. **Keep CDN abstract**:
   - Free Cloudflare caching rules can cache video chunks up to platform fair-use limits, but do not rely on "unlimited free video streaming" from any third-party provider.
