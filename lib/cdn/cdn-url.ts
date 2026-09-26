/**
 * CHILLER CDN URL GENERATOR & SECURITY SIGNING ENGINE
 * Constructs CDN edge delivery URLs, generates secure HMAC-SHA256 tokens,
 * and parses HTTP byte-range coordinates.
 */

import crypto from "crypto";
import { getCdnGlobalConfig } from "./cdn-config";
import { CdnNodeConfig } from "./cdn-types";

export interface SignedPlaybackToken {
  mediaId: string | number;
  clientIp?: string;
  expiresAt: number;
  signature: string;
}

export class CdnUrlEngine {
  /**
   * Build CDN accelerated HLS Master Manifest URL
   */
  public static buildManifestUrl(
    cdn: CdnNodeConfig,
    mediaId: string | number,
    version = "v1",
    token?: string
  ): string {
    const base = cdn.baseUrl.replace(/\/$/, "");
    const tokenSuffix = token ? `?token=${encodeURIComponent(token)}` : "";

    if (!base) {
      // Local fallback / relative edge delivery
      return `/api/cdn/proxy?mediaId=${encodeURIComponent(String(mediaId))}&file=master.m3u8${token ? `&token=${encodeURIComponent(token)}` : ""}`;
    }

    return `${base}/media/${encodeURIComponent(String(mediaId))}/${version}/master.m3u8${tokenSuffix}`;
  }

  /**
   * Build immutable VOD Segment URL
   */
  public static buildSegmentUrl(
    cdn: CdnNodeConfig,
    mediaId: string | number,
    segmentName: string,
    version = "v1"
  ): string {
    const base = cdn.baseUrl.replace(/\/$/, "");
    if (!base) {
      return `/api/cdn/proxy?mediaId=${encodeURIComponent(String(mediaId))}&file=${encodeURIComponent(segmentName)}`;
    }
    return `${base}/media/${encodeURIComponent(String(mediaId))}/${version}/video/${encodeURIComponent(segmentName)}`;
  }

  /**
   * Build Subtitle Delivery URL
   */
  public static buildSubtitleUrl(
    cdn: CdnNodeConfig,
    mediaId: string | number,
    lang: string
  ): string {
    const base = cdn.baseUrl.replace(/\/$/, "");
    if (!base) {
      return `/api/subtitles/${encodeURIComponent(String(mediaId))}?lang=${encodeURIComponent(lang)}`;
    }
    return `${base}/subtitles/${encodeURIComponent(String(mediaId))}/${encodeURIComponent(lang)}.vtt`;
  }

  /**
   * Generate secure HMAC-SHA256 token for media stream delivery
   */
  public static generateSignedToken(
    mediaId: string | number,
    clientIp = "0.0.0.0",
    expiresInSeconds = 7200
  ): string {
    const config = getCdnGlobalConfig();
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `${mediaId}:${clientIp}:${expiresAt}`;
    const sig = crypto.createHmac("sha256", config.signingSecret).update(payload).digest("hex");

    return Buffer.from(
      JSON.stringify({
        mediaId,
        clientIp,
        expiresAt,
        sig,
      })
    ).toString("base64url");
  }

  /**
   * Validate signed media delivery token
   */
  public static verifySignedToken(token: string): { valid: boolean; mediaId?: string | number; error?: string } {
    try {
      const config = getCdnGlobalConfig();
      const raw = Buffer.from(token, "base64url").toString("utf-8");
      const { mediaId, clientIp, expiresAt, sig } = JSON.parse(raw);

      if (Date.now() / 1000 > expiresAt) {
        return { valid: false, error: "EXPIRED_TOKEN" };
      }

      const payload = `${mediaId}:${clientIp}:${expiresAt}`;
      const expected = crypto.createHmac("sha256", config.signingSecret).update(payload).digest("hex");

      if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return { valid: true, mediaId };
      }

      return { valid: false, error: "INVALID_SIGNATURE" };
    } catch (err: any) {
      return { valid: false, error: err.message || "MALFORMED_TOKEN" };
    }
  }

  /**
   * Parse HTTP Range header into byte coordinates
   */
  public static parseRangeHeader(
    rangeHeader: string | null | undefined,
    totalFileSize: number
  ): { start: number; end: number; contentLength: number } | null {
    if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
      return null;
    }

    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalFileSize - 1;

    if (isNaN(start) || start < 0 || start >= totalFileSize || end < start) {
      return null;
    }

    const clampedEnd = Math.min(end, totalFileSize - 1);
    return {
      start,
      end: clampedEnd,
      contentLength: clampedEnd - start + 1,
    };
  }
}
