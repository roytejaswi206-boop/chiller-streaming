import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SIGNING_SECRET = process.env.STREAMING_SIGNING_SECRET || "velora_default_signing_secret_key_8892";

export interface PlaybackManifest {
  streamUrl: string;
  backupStreamUrls: string[];
  token: string;
  originServer: {
    id: string;
    name: string;
    region: string;
    endpoint: string;
    status: string;
  };
  expiresAt: number;
}

/**
 * Generate HMAC-SHA256 secure signed playback token
 */
export function generatePlaybackToken(videoId: string, clientIp = "0.0.0.0", expiresInSeconds = 7200): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${videoId}:${clientIp}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex");
  const token = Buffer.from(JSON.stringify({ videoId, clientIp, expiresAt, sig: signature })).toString("base64url");
  return token;
}

/**
 * Verify signed playback token
 */
export function verifyPlaybackToken(token: string): { valid: boolean; videoId?: string; error?: string } {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const { videoId, clientIp, expiresAt, sig } = JSON.parse(raw);

    if (Date.now() / 1000 > expiresAt) {
      return { valid: false, error: "Token expired" };
    }

    const payload = `${videoId}:${clientIp}:${expiresAt}`;
    const expectedSig = crypto.createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return { valid: true, videoId };
    }
    return { valid: false, error: "Invalid signature" };
  } catch (err: any) {
    return { valid: false, error: err.message || "Malformed token" };
  }
}

/**
 * Smart Origin Selection & Failover Router
 * Routes to the verified healthiest origin node, or falls back to local Nginx/Storage.
 */
export async function selectBestOrigin(
  videoId: string,
  userRegion?: string,
  clientIp?: string
): Promise<PlaybackManifest | null> {
  const video = await prisma.video.findFirst({
    where: {
      OR: [
        { id: videoId },
        { slug: videoId },
        { publicId: videoId },
      ],
    },
    include: {
      origins: {
        include: { server: true },
      },
      variants: true,
    },
  });

  if (!video) return null;

  // Filter ONLY genuinely healthy and enabled servers
  const healthyOrigins = video.origins.filter(
    (vo) => vo.server.isHealthy && vo.server.isEnabled && vo.status === "READY"
  );

  const token = generatePlaybackToken(video.id, clientIp);
  const expiresAt = Math.floor(Date.now() / 1000) + 7200;

  // If no external origin servers are healthy or verified, stream directly from Local Storage / Origin Nginx
  if (healthyOrigins.length === 0) {
    let defaultMaster = video.hlsMasterUrl || video.fallbackMp4Url || "";

    // If CDN base URL is configured, prepend it
    const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, "");
    if (cdnBase && defaultMaster && !defaultMaster.startsWith("http")) {
      defaultMaster = `${cdnBase}${defaultMaster.startsWith("/") ? "" : "/"}${defaultMaster}`;
    }

    return {
      streamUrl: defaultMaster,
      backupStreamUrls: video.fallbackMp4Url ? [video.fallbackMp4Url] : [],
      token,
      originServer: {
        id: "LOCAL-ORIGIN",
        name: "PRIMARY-LOCAL-ORIGIN",
        region: "local",
        endpoint: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        status: "ONLINE",
      },
      expiresAt,
    };
  }

  // Sort verified origins by latency and region match
  healthyOrigins.sort((a, b) => {
    if (userRegion) {
      const aMatch = a.server.region.toLowerCase().includes(userRegion.toLowerCase());
      const bMatch = b.server.region.toLowerCase().includes(userRegion.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }

    // Lower latency first
    if (a.server.latencyMs > 0 && b.server.latencyMs > 0) {
      return a.server.latencyMs - b.server.latencyMs;
    }

    return a.server.priority - b.server.priority;
  });

  const bestOrigin = healthyOrigins[0];
  const streamPath = video.hlsMasterUrl || video.fallbackMp4Url || "";
  const originBase = bestOrigin.server.endpoint.replace(/\/$/, "");

  const streamUrl = originBase && streamPath.startsWith("http")
    ? streamPath
    : originBase
    ? `${originBase}${streamPath.startsWith("/") ? "" : "/"}${streamPath}`
    : streamPath;

  const backupStreamUrls = healthyOrigins.slice(1).map((o) => {
    const base = o.server.endpoint.replace(/\/$/, "");
    return base ? `${base}${streamPath.startsWith("/") ? "" : "/"}${streamPath}` : streamPath;
  });

  return {
    streamUrl,
    backupStreamUrls,
    token,
    originServer: {
      id: bestOrigin.server.id,
      name: bestOrigin.server.name,
      region: bestOrigin.server.region,
      endpoint: bestOrigin.server.endpoint,
      status: bestOrigin.server.status,
    },
    expiresAt,
  };
}
