/**
 * Site Configuration & Canonical Domain Resolver
 * Ensures CHILLER consistently uses canonical branding and avoids duplicate content penalties.
 * Authoritative production domain: https://chillerstream.duckdns.org
 */

export const CANONICAL_BASE_URL = "https://chillerstream.duckdns.org";
export const DEFAULT_SITE_URL = "https://chillerstream.duckdns.org";

export function getSiteUrl(): string {
  // 1. Explicitly configured custom domain
  if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }

  // 2. Client-side active origin (for dynamic links, shares, etc.)
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  // 3. Fallback app url if provided
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  return DEFAULT_SITE_URL;
}

/**
 * Returns the absolute canonical URL for search engines and social crawlers.
 * Always resolves to the authoritative production domain (https://chillerstream.duckdns.org)
 * regardless of whether visited via Vercel fallback (streaming-chi-red.vercel.app) or localhost,
 * ensuring Google unifies all indexing signals onto the production domain.
 */
export function getCanonicalUrl(path: string = ""): string {
  const base = process.env.NEXT_PUBLIC_CANONICAL_URL || CANONICAL_BASE_URL;
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return cleanPath === "/" ? cleanBase : `${cleanBase}${cleanPath}`;
}
