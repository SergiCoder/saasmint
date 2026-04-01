import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/billing",
  "/settings",
  "/org",
  "/admin",
];

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Supabase email confirmation sends ?code= to the site root.
  // Redirect to the auth callback route so the code gets exchanged.
  const code = searchParams.get("code");
  const localePrefix = [...routing.locales]
    .sort((a: string, b: string) => b.length - a.length) // match longer codes first (pt-BR before pt)
    .find((l: string) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
  const pathnameWithoutLocale = localePrefix
    ? pathname.slice(localePrefix.length + 1) // +1 for leading /
    : pathname;
  if (code && (pathnameWithoutLocale === "" || pathnameWithoutLocale === "/")) {
    const locale = pathname.split("/")[1] ?? routing.defaultLocale;
    const callbackUrl = new URL(
      `/${locale}/auth/callback?code=${code}`,
      request.url,
    );
    return NextResponse.redirect(callbackUrl);
  }

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    pathnameWithoutLocale.startsWith(p),
  );

  if (isProtected) {
    const response = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (
            cookiesToSet: {
              name: string;
              value: string;
              options?: Parameters<typeof response.cookies.set>[2];
            }[],
          ) =>
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            ),
        },
      },
    );
    // getUser() validates the JWT server-side and refreshes expired tokens.
    // getSession() only reads cookies without validation, so stale tokens
    // would pass the middleware but get rejected by the Django API.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const locale = pathname.split("/")[1] ?? routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
    const intlResponse = intlMiddleware(request);
    response.cookies.getAll().forEach(({ name, value }) => {
      intlResponse.cookies.set(name, value);
    });
    return intlResponse;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
