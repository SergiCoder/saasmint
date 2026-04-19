import createMiddleware from "next-intl/middleware";
import { routing, stripLocalePrefix } from "@/lib/i18n/routing";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_NAME,
  REFRESH_TOKEN_NAME,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "@/infrastructure/auth/cookies";
import { env } from "@/lib/env";
import { PATHNAME_HEADER } from "@/lib/pathname";

const intlMiddleware = createMiddleware(routing);

const API_URL = env.NEXT_PUBLIC_API_URL;

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/subscription",
  "/profile",
  "/org",
  "/admin",
];

// Routes that never read the session user — refreshing the access token
// while we're serving them is wasted latency on every navigation.
const ANONYMOUS_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
  "/invitations",
];

function needsUser(pathnameWithoutLocale: string): boolean {
  return !ANONYMOUS_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p));
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return true;
    const payload: unknown = JSON.parse(atob(parts[1]));
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("exp" in payload) ||
      typeof (payload as { exp: unknown }).exp !== "number"
    ) {
      return true;
    }
    const exp = (payload as { exp: number }).exp;
    // Consider expired 30s early to avoid race conditions
    return exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

/**
 * Wraps a NextResponse so downstream server components can read the current
 * pathname via `headers().get(PATHNAME_HEADER)`. We rebuild the response via
 * NextResponse.next/rewrite with modified request headers — setting response
 * headers alone does not propagate to server components.
 */
function withPathnameHeader(
  request: NextRequest,
  intlResponse: NextResponse,
): NextResponse {
  // Redirects never reach a server component render; return as-is.
  if (intlResponse.headers.get("location")) return intlResponse;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);

  const rewriteUrl = intlResponse.headers.get("x-middleware-rewrite");
  const response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      })
    : NextResponse.next({ request: { headers: requestHeaders } });

  intlResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  intlResponse.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "x-middleware-rewrite" || k === "x-middleware-next") return;
    if (!response.headers.has(key)) response.headers.set(key, value);
  });

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameWithoutLocale = stripLocalePrefix(pathname);

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    pathnameWithoutLocale.startsWith(p),
  );

  let accessToken = request.cookies.get(ACCESS_TOKEN_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_NAME)?.value;

  // Only refresh on routes that actually read the user (protected app routes
  // and the marketing layout which personalises the nav). Anonymous-only
  // routes (login, signup, OAuth callback, invitation acceptance) never
  // touch the session, so skip the Django round-trip on those navigations.
  const shouldRefresh =
    needsUser(pathnameWithoutLocale) &&
    (!accessToken || isTokenExpired(accessToken)) &&
    !!refreshToken;

  if (shouldRefresh) {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          access_token: string;
          refresh_token: string;
        };
        accessToken = data.access_token;

        // Forward refreshed tokens to downstream server code (pages,
        // server components) so they read the new token, not the stale one.
        request.cookies.set(ACCESS_TOKEN_NAME, data.access_token);
        request.cookies.set(REFRESH_TOKEN_NAME, data.refresh_token);

        const intlResponse = intlMiddleware(request);
        intlResponse.cookies.set(
          ACCESS_TOKEN_NAME,
          data.access_token,
          accessTokenCookieOptions,
        );
        intlResponse.cookies.set(
          REFRESH_TOKEN_NAME,
          data.refresh_token,
          refreshTokenCookieOptions,
        );
        return withPathnameHeader(request, intlResponse);
      }
    } catch {
      // Refresh failed — fall through
    }
  }

  if (isProtected && (!accessToken || isTokenExpired(accessToken))) {
    const locale = pathname.split("/")[1] ?? routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return withPathnameHeader(request, intlMiddleware(request));
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|icon.svg|api).*)"],
};
