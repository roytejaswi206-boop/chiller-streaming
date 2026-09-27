import type { NextConfig } from "next";

const AUTH_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://chillerstream.duckdns.org https://streaming-chi-red.vercel.app",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "250mb",
    },
  },
  async headers() {
    const authRoutes = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/change-password",
    ];

    const authHeaderConfigs = authRoutes.map((route) => ({
      source: route,
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
        { key: "Content-Security-Policy", value: AUTH_CSP },
      ],
    }));

    return [
      // 1. API CORS & Headers
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
      // 2. Embed routes (allow legitimate embedding for external players)
      {
        source: "/embed/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
        ],
      },
      // 3. Service Worker
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // 4. PWA Manifest
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      // 5. Version API
      {
        source: "/api/version",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
        ],
      },
      // 6. Sitemap & Robots Edge Caching Headers for Search Engine Crawlers
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Content-Type", value: "application/xml; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
        ],
      },
      // 7. Hardened Security Headers for Authentication Routes
      ...authHeaderConfigs,
      // 7. Global Baseline Security Headers for all other routes
      {
        source: "/((?!embed).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
