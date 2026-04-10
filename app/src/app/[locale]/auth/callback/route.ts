import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_NAME,
  REFRESH_TOKEN_NAME,
  ACCESS_TOKEN_MAX_AGE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "@/infrastructure/auth/cookies";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const expiresIn = searchParams.get("expires_in");
  const error = searchParams.get("error");
  const nextParam = searchParams.get("next") ?? "/dashboard";

  // Prevent open redirect: only allow relative paths (reject protocol-relative URLs)
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
  }

  if (accessToken && refreshToken) {
    const response = NextResponse.redirect(new URL(next, origin));

    const parsed = expiresIn ? parseInt(expiresIn, 10) : NaN;
    // Cap at 1 hour to limit damage if the parameter is tampered with
    const accessMaxAge =
      Number.isFinite(parsed) && parsed > 0 && parsed <= 3600
        ? parsed
        : ACCESS_TOKEN_MAX_AGE;

    response.cookies.set(ACCESS_TOKEN_NAME, accessToken, {
      ...accessTokenCookieOptions,
      maxAge: accessMaxAge,
    });

    response.cookies.set(
      REFRESH_TOKEN_NAME,
      refreshToken,
      refreshTokenCookieOptions,
    );

    // Prevent tokens from leaking via Referer header on the redirect target
    response.headers.set("Referrer-Policy", "no-referrer");

    return response;
  }

  return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
}
