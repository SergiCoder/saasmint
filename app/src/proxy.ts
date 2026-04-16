import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_NAME,
  REFRESH_TOKEN_NAME,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "@/infrastructure/auth/cookies";

const intlMiddleware = createMiddleware(routing);

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/subscription",
  "/profile",
  "/org",
  "/admin",
];

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as {
      exp?: number;
    };
    if (typeof payload.exp !== "number") return true;
    // Consider expired 30s early to avoid race conditions
    return payload.exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const localePrefix = [...routing.locales]
    .sort((a: string, b: string) => b.length - a.length)
    .find((l: string) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
  const pathnameWithoutLocale = localePrefix
    ? pathname.slice(localePrefix.length + 1)
    : pathname;

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    pathnameWithoutLocale.startsWith(p),
  );

  let accessToken = request.cookies.get(ACCESS_TOKEN_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_NAME)?.value;

  // Attempt token refresh whenever the access token is expired and a refresh
  // token exists, regardless of whether the route is protected.  Public pages
  // like /pricing read the user profile to personalise currency / locale, so
  // they also need a valid token.
  if ((!accessToken || isTokenExpired(accessToken)) && refreshToken) {
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
        return intlResponse;
      }
    } catch {
      // Refresh failed — fall through
    }
  }

  if (isProtected && (!accessToken || isTokenExpired(accessToken))) {
    const locale = pathname.split("/")[1] ?? routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|icon.svg|api).*)"],
};
