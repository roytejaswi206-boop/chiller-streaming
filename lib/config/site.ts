/**
 * Site Configuration & Canonical Domain Resolver
 * Ensures CHILLER consistently uses canonical branding and avoids exposing raw hosting URLs.
 */

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

export function getCanonicalUrl(path: string = ""): string {
  const base = getSiteUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath === "/" ? "" : cleanPath}`;
}
