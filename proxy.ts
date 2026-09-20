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

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

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
  // 2. Protect /admin routes
  //    Unauthenticated users → /login
  //    Authenticated non-admins → /  (forbidden)
  // ────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = (token as any).role as string | undefined;
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
  }

  return NextResponse.next();
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
