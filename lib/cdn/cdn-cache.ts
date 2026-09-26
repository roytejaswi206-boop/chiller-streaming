/**
 * CHILLER CDN CACHE POLICY & REQUEST COLLAPSING ENGINE
 * Generates standards-compliant Cache-Control headers, normalizes cache keys
 * to avoid fragmentation, and protects origins against cache stampedes.
 */

import { CdnAssetType } from "./cdn-types";
import { getCdnGlobalConfig } from "./cdn-config";

export class CdnCacheEngine {
  // In-flight requests for origin request collapsing (stampede protection)
  private static inFlightRequests: Map<string, Promise<any>> = new Map();

  /**
   * Produce exact Cache-Control headers depending on media asset nature
   */
  public static getCacheHeaders(assetType: CdnAssetType): Record<string, string> {
    const config = getCdnGlobalConfig();

    switch (assetType) {
      case "MASTER_MANIFEST":
      case "VARIANT_MANIFEST":
        return {
          "Cache-Control": `public, max-age=${config.manifestTtl}, stale-while-revalidate=120`,
          "Vary": "Accept-Encoding, Range, Origin",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
        };

      case "VOD_SEGMENT":
      case "VOD_AUDIO":
        return {
          "Cache-Control": `public, max-age=${config.segmentTtl}, immutable`,
          "Accept-Ranges": "bytes",
          "Vary": "Range, Origin",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
          "X-Content-Type-Options": "nosniff",
        };

      case "SUBTITLE":
        return {
          "Cache-Control": `public, max-age=${config.subtitleTtl}, stale-while-revalidate=604800`,
          "Content-Type": "text/vtt; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        };

      case "POSTER":
      case "BACKDROP":
        return {
          "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
          "Access-Control-Allow-Origin": "*",
        };

      default:
        return {
          "Cache-Control": `public, max-age=${config.defaultTtl}`,
          "Access-Control-Allow-Origin": "*",
        };
    }
  }

  /**
   * Safety guard: ensure dynamic, auth, or user API responses are NEVER cached publicly
   */
  public static getPrivateNoCacheHeaders(): Record<string, string> {
    return {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, private",
      "Pragma": "no-cache",
      "Expires": "0",
    };
  }

  /**
   * Normalize CDN Cache Key:
   * Strips noisy tracking/analytics query parameters to avoid cache fragmentation,
   * while preserving authorized security signatures and byte range coordinates.
   */
  public static normalizeCacheKey(urlStr: string): string {
    try {
      const url = new URL(urlStr, "https://cdn.chiller.site");
      const allowedParams = new Set(["sig", "token", "t", "expires", "v", "quality", "audio", "sub", "range"]);
      const searchParams = new URLSearchParams();

      for (const [key, value] of url.searchParams.entries()) {
        const lower = key.toLowerCase();
        if (allowedParams.has(lower)) {
          searchParams.set(lower, value);
        }
      }

      const queryString = searchParams.toString();
      return `${url.origin}${url.pathname}${queryString ? `?${queryString}` : ""}`;
    } catch {
      return urlStr;
    }
  }

  /**
   * Origin Shield / Request Collapsing:
   * When hundreds of simultaneous users request the same uncached segment,
   * collapse concurrent fetches into a single origin request to prevent stampedes.
   */
  public static async collapseOriginFetch<T>(
    cacheKey: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const existing = this.inFlightRequests.get(cacheKey);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = fetcher().finally(() => {
      this.inFlightRequests.delete(cacheKey);
    });

    this.inFlightRequests.set(cacheKey, promise);
    return promise;
  }
}
