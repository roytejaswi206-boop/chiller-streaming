# Velora — Telegram Video Ingestion System Setup Guide

This guide covers how to configure, connect, and use the Telegram Video Ingestion Engine in Velora.

---

## 1. Overview

The Velora Telegram Ingestion Engine allows you to import authorized video archives directly from Telegram into Velora's adaptive HLS streaming pipeline without downloading entire files into browser memory or running transcoding inside the web server.

### Supported Sources:
- **Saved Messages** (Personal Telegram cloud storage)
- **Private Channels & Discussion Groups** (where your account is a member or admin)
- **Public Channels & Supergroups**
- **Direct Dialogs**

### Pipeline Architecture:
```
Telegram Cloud
      │
      ▼  (MTProto / GramJS Streaming Chunks)
Velora Telegram Downloader
      │
      ├──> Disk Space Guard (StatFS Check > 5GB buffer)
      ├──> Temporary Staging (`media_storage/tmp/telegram/{jobId}/{mediaId}/`)
      ├──> On-the-Fly SHA-256 Checksum Calculation
      └──> 3-Layer Duplicate Detection:
             1. (Source ID, Message ID) check
             2. (fileUniqueId, size, duration) check
             3. SHA-256 hash match against existing catalog
      │
      ▼  (Video Job Queue)
Dedicated Transcoding Worker (`npm run worker`)
      │
      ├──> FFprobe Metadata Extraction
      ├──> FFmpeg Multi-Bitrate HLS (1080p, 720p, 480p, 360p)
      ├──> Master Playlist (`master.m3u8`) & WebP Thumbnails
      ├──> Cleanup of Temporary Staging File
      └──> Update Video & TelegramMedia Status to `READY`
```

---

## 2. Prerequisites & Credentials

To access Saved Messages and private channels, Telegram requires **MTProto API credentials** (User Client mode).

### Step 2.1: Obtain API ID and API Hash
1. Log in to [https://my.telegram.org](https://my.telegram.org) with your Telegram phone number.
2. Click **API development tools**.
3. Fill in the application details:
   - **App title**: `Velora Ingest` (or any name)
   - **Short name**: `veloraingest`
   - **Platform**: `Desktop` or `Web`
4. Copy your **`api_id`** (integer) and **`api_hash`** (32-character hex string).

### Step 2.2: Configure `.env`
Add these variables to your `.env` file in the project root:

```env
TELEGRAM_API_ID="12345678"
TELEGRAM_API_HASH="0123456789abcdef0123456789abcdef"

# Optional: If you already have a GramJS StringSession
TELEGRAM_SESSION_STRING=""

# Optional: Default phone number for quick login in admin UI
TELEGRAM_PHONE_NUMBER="+1234567890"
```

---

## 3. Authenticating in the Admin UI

1. Open your browser and navigate to:
   ```
   http://localhost:3000/admin/telegram
   ```
2. Click **"Connect Telegram Account"** (or **"Re-Authenticate"**).
3. **Step 1: Enter Credentials**
   - Provide your `API ID` and `API Hash` (if not loaded from `.env`).
   - Enter your international phone number with country code (e.g. `+14155552671`).
   - Click **Send Verification Code**.
4. **Step 2: Enter Verification Code**
   - Telegram sends a login code inside your official Telegram app (from the Service Notifications chat).
   - Enter the code in Velora.
   - If your account has Two-Factor Authentication (2FA / Cloud Password enabled), enter your 2FA password.
   - Click **Verify & Save Session**.
5. Once authenticated, Velora securely stores the encrypted session string. The connection indicator will turn green: `CONNECTED (Authorized User)`.

---

## 4. Scanning & Importing Videos

### Step 4.1: Select a Source
On `/admin/telegram`:
- **Saved Messages**: Select `Saved Messages` (target ID: `"me"`).
- **Channels & Groups**: Use the dropdown list to pick any joined channel or group, or enter a channel username / invite link / peer ID.

### Step 4.2: Scan for Videos
- Enter a batch limit (e.g. `100` or `500`).
- Click **"Scan Source for Videos"**.
- Velora's scanner runs through messages using cursor pagination, identifying:
  - Video documents (`video/mp4`, `video/quicktime`, etc.)
  - Video notes & animations
  - Telegram video file metadata (dimensions, duration, size, mime type).
- Duplicate pre-checks run immediately:
  - If a message was already scanned and imported, it is flagged as `DUPLICATE` to save bandwidth and disk space.

### Step 4.3: Dispatch Import Job
- Select which discovered videos to import (or click **"Select All"**).
- Configure optional settings:
  - **Category**: Select a Velora category (e.g., Action, Drama, Uncategorized).
  - **Auto-Publish**: Toggle whether videos become public immediately upon reaching `READY` status.
  - **Max Concurrent Downloads**: Set concurrency (default: `2`).
- Click **"Start Ingestion Job"**.

---

## 5. Monitoring & Control

The Ingestion Manager provides full real-time operational control:
- **Active Jobs Table**: Displays real-time progress bars, downloaded bytes, active state, and estimated speed.
- **Job Controls**:
  - **Pause**: Halts current item downloads cleanly.
  - **Resume**: Continues downloading remaining queue items.
  - **Cancel**: Terminates pending jobs and releases temporary disk storage.
- **Item Level Actions**:
  - If a download or transcode failed due to a network glitch, click **"Retry"** on that individual item.

---

## 6. Worker Execution

The Next.js web application **never** runs transcoding directly. Ensure the dedicated worker is running in a terminal:

```bash
# In the streaming root directory:
npm run worker
```

The worker continuously listens for incoming media jobs, probes input files with `ffprobe`, generates multi-bitrate HLS streams (1080p, 720p, 480p, 360p) with `ffmpeg`, generates thumbnails, verifies HLS integrity, and marks the video as `READY`.

---

## 7. Troubleshooting & Best Practices

| Issue | Cause | Solution |
|---|---|---|
| `SESSION_PASSWORD_NEEDED` | Account has 2FA enabled | Enter your Telegram cloud password in the 2FA password field in the modal. |
| `PHONE_CODE_INVALID` | Incorrect SMS code | Request a fresh code from Telegram and enter it promptly. |
| `FLOOD_WAIT_X` | Telegram rate limit triggered | Telegram requires waiting `X` seconds. Lower your scanner batch size or increase delay between imports. |
| `INSUFFICIENT_DISK_SPACE` | Free disk space < 5 GB buffer | Disk Guard pauses imports to prevent system crash. Free up storage in `media_storage/` or expand disk volume. |
| Videos not appearing in Watch | Worker is stopped | Start the dedicated worker: `npm run worker`. Check worker terminal logs for FFmpeg output. |
