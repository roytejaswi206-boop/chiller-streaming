/**
 * proxy.ts (formerly middleware.ts — renamed for Next.js 16 compatibility)
 *
 * CHILLER — Next.js Edge Proxy
 *
 * Responsibilities:
 * 1. Enforce mustChangePassword redirect → /change-password
 * 2. Protect /admin routes — redirect unauthenticated users to /login
 *
 * NOTE: Proxy runs on Edge runtime (no Prisma).
 * This is a secondary guard only. Primary authorization lives in API routes
 * via requireAdmin() / requireSuperAdmin() which re-validate from the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "velora_default_secret_key_change_in_prod";
const DESIGNATED_SUPER_ADMIN_EMAILS = new Set([
  "roytejaswi40@gmail.com",
  "roytejaswi206@gmail.com",
]);

const ALLOWED_ORIGINS = new Set([
  "https://chillerstream.duckdns.org",
  "http://chillerstream.duckdns.org",
  "https://chillerstream.unaux.com",
  "http://chillerstream.unaux.com",
  "https://streaming-chi-red.vercel.app",
  "https://chiller.site",
  "http://localhost:3000",
]);

export async function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowedOrigin = origin
    ? ALLOWED_ORIGINS.has(origin) || origin.endsWith(".unaux.com") || origin.endsWith(".duckdns.org")
    : false;

  const { pathname } = request.nextUrl;

  // Handle CORS Preflight for API requests
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin && origin ? origin : "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token, Range",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const token = await getToken({
    req: request,
    secret: NEXTAUTH_SECRET,
  });

  // ────────────────────────────────────────────────────────────────────────
  // 1. Force password change
  //    If the user has mustChangePassword=true, redirect every protected route
  //    to /change-password (except the change-password page itself and auth API)
  // ────────────────────────────────────────────────────────────────────────
  const isChangePasswordPage = pathname === "/change-password";
  const isAuthApi = pathname.startsWith("/api/auth");
  const isChangePasswordApi = pathname === "/api/account/change-password";
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/intro") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public");

  if (
    token &&
    (token as any).mustChangePassword === true &&
    !isChangePasswordPage &&
    !isAuthApi &&
    !isChangePasswordApi &&
    !isPublicAsset
  ) {
    const changePasswordUrl = new URL("/change-password", request.url);
    return NextResponse.redirect(changePasswordUrl);
  }

  // ────────────────────────────────────────────────────────────────────────
  // 2. Protect /admin routes (except public diagnostic playback-lab)
  //    Unauthenticated users → /login
  //    Authenticated non-admins → /  (forbidden)
  // ────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/playback-lab")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const tokenEmail = (token?.email as string)?.trim().toLowerCase();
    const isSuperAdmin = tokenEmail && DESIGNATED_SUPER_ADMIN_EMAILS.has(tokenEmail);
    const role = isSuperAdmin ? "SUPER_ADMIN" : ((token as any).role as string | undefined);
    const adminRoles = new Set(["ADMIN", "SUPER_ADMIN"]);

    if (!role || !adminRoles.has(role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // 3. Protect /api/admin/* routes
  //    These are also protected at the handler level (defense in depth).
  // ────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/admin") || pathname.startsWith("/api/superadmin")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokenEmail = (token?.email as string)?.trim().toLowerCase();
    const isSuperAdmin = tokenEmail && DESIGNATED_SUPER_ADMIN_EMAILS.has(tokenEmail);
    const role = isSuperAdmin ? "SUPER_ADMIN" : ((token as any).role as string | undefined);
    const adminRoles = new Set(["ADMIN", "SUPER_ADMIN"]);
    if (!role || !adminRoles.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const response = NextResponse.next();
  if (pathname.startsWith("/api") && isAllowedOrigin && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - /api/auth/* (NextAuth internal routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
