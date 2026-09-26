/**
 * CHILLER API CONFIGURATION & URL RESOLVER
 * Ensures frontend components correctly target the backend API origin
 * regardless of whether hosted on Vercel, ProFreeHost (chillerstream.unaux.com), or localhost.
 */

export const PRODUCTION_BACKEND_URL = "https://streaming-chi-red.vercel.app";
export const PRODUCTION_FRONTEND_URL = "https://chillerstream.unaux.com";

export function getApiBaseUrl(): string {
  // 1. Explicitly configured API URL in environment
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  // 2. In browser context on ProFreeHost/unaux.com, route API requests to production backend
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("unaux.com") || host.includes("profreehost")) {
      return PRODUCTION_BACKEND_URL;
    }
  }

  // 3. Same-origin fallback
  return "";
}

export function resolveApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return cleanPath;
  return `${base}${cleanPath}`;
}
