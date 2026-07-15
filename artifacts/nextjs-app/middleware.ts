import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizePath, requiresAuth, ROLE_PATH_PREFIXES } from "@/lib/routes/guards";

/**
 * Middleware soft guard for X!Y.
 *
 * Primary auth lives in localStorage (`xiy_token`) via AuthProvider — use
 * `ProtectedRoute` and `RoleGuard` client components for enforcement.
 *
 * This middleware:
 * 1. Applies security headers on every response.
 * 2. Optionally rewrites to /403 when MIDDLEWARE_AUTH_GUARD=true and the
 *    `xiy_token` cookie is missing on role-protected prefixes.
 *
 * Enable cookie-based guard only after login also sets the `xiy_token` cookie.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
  "X-XSS-Protection": "0",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-site",
};

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

function applySecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function isRoleProtectedPath(path: string): boolean {
  return ROLE_PATH_PREFIXES.some(
    ({ prefix }) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const path = normalizePath(request.nextUrl.pathname, basePath);

  if (process.env.MIDDLEWARE_AUTH_GUARD === "true") {
    const hasToken =
      request.cookies.has("xiy_token") ||
      request.headers.get("authorization")?.startsWith("Bearer ");

    if (!hasToken && requiresAuth(path, "") && isRoleProtectedPath(path)) {
      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = `${basePath}/403`;
      return applySecurityHeaders(NextResponse.rewrite(forbiddenUrl));
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
