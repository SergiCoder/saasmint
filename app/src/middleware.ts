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
import { decodeJwtPayload } from "@/lib/jwtDecode";
import { CSP_NONCE_HEADER, PATHNAME_HEADER } from "@/lib/pathname";
import { isMemberOf } from "@/lib/typeGuards";

const intlMiddleware = createMiddleware(routing);

const API_URL = env.NEXT_PUBLIC_API_URL;

// Belt-and-braces: a misconfigured deployment that ships with NODE_ENV unset
// or "development" must not relax the production CSP. Vercel sets
// VERCEL_ENV=production on the live deployment; on platforms without it the
// fallback is a strict NODE_ENV === "development" check.
const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
const IS_DEV =
  process.env.NODE_ENV === "development" && vercelEnv !== "production";

const apiOrigin = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
})();
const OAUTH_AVATAR_HOSTS = [
  "https://lh3.googleusercontent.com",
  "https://avatars.githubusercontent.com",
  "https://graph.microsoft.com",
];

/**
 * Builds a per-request Content-Security-Policy with a fresh nonce for
 * `script-src`. `'strict-dynamic'` lets nonce-tagged scripts load further
 * scripts without listing their hashes, while modern browsers ignore the
 * `'unsafe-inline'` fallback we emit alongside it (the fallback is only for
 * pre-`strict-dynamic` browsers — the production CSP they see is no worse
 * than the pre-nonce baseline). Dev keeps `'unsafe-eval'` for HMR.
 */
function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'${IS_DEV ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${apiOrigin} ${OAUTH_AVATAR_HOSTS.join(" ")}`.trim(),
    `font-src 'self' data:`,
    `connect-src 'self' ${apiOrigin}${IS_DEV ? " ws: wss:" : ""}`.trim(),
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

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
  "/auth/error",
  "/invitations",
];

function needsUser(pathnameWithoutLocale: string): boolean {
  return !ANONYMOUS_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p));
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  // Consider expired 30s early to avoid race conditions.
  return payload.exp * 1000 < Date.now() + 30_000;
}

/**
 * Wraps a NextResponse so downstream server components can read the current
 * pathname via `headers().get(PATHNAME_HEADER)` and the CSP nonce via
 * `headers().get(CSP_NONCE_HEADER)`. We rebuild the response via
 * NextResponse.next/rewrite with modified request headers — setting response
 * headers alone does not propagate to server components.
 */
function withPathnameHeader(
  request: NextRequest,
  intlResponse: NextResponse,
  nonce: string,
): NextResponse {
  // Redirects never reach a server component render; return as-is.
  if (intlResponse.headers.get("location")) return intlResponse;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);

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

  // Override the static next.config.ts CSP with a per-request nonce so inline
  // bootstrap scripts can be tagged instead of relying on `'unsafe-inline'`
  // alone. See `buildCsp` for the nonce/strict-dynamic rationale.
  response.headers.set("Content-Security-Policy", buildCsp(nonce));

  return response;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = generateNonce();

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

  let refreshRejected = false;

  if (shouldRefresh) {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (res.ok) {
        // Zod is intentionally excluded from the Edge bundle (see env.ts),
        // so we cast directly. If the response shape ever changes, the
        // server actions that next consume the cookie will re-issue the
        // refresh on their own apiFetch — degrades gracefully to a redirect.
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
        return withPathnameHeader(request, intlResponse, nonce);
      }

      // Django rejected the refresh (401/invalid/revoked/user-deleted).
      // Clear the stale cookies so downstream gateway calls don't send a
      // token that will trip their 401 branches.
      refreshRejected = true;
      accessToken = undefined;
      request.cookies.delete(ACCESS_TOKEN_NAME);
      request.cookies.delete(REFRESH_TOKEN_NAME);
    } catch {
      // Network error (API unreachable) — leave cookies alone, fall through.
    }
  }

  if (isProtected && (!accessToken || isTokenExpired(accessToken))) {
    const firstSegment = pathname.split("/")[1];
    const locale =
      firstSegment && isMemberOf(routing.locales, firstSegment)
        ? firstSegment
        : routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const intlResponse = intlMiddleware(request);
  if (refreshRejected) {
    intlResponse.cookies.delete(ACCESS_TOKEN_NAME);
    intlResponse.cookies.delete(REFRESH_TOKEN_NAME);
  }
  return withPathnameHeader(request, intlResponse, nonce);
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|icon.svg|api).*)"],
};
