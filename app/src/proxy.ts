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
  const { pathname } = request.nextUrl;

  // Strip locale prefix to check route protection
  const pathnameWithoutLocale = pathname.replace(
    /^\/[a-z]{2}(-[A-Z]{2})?(-[A-Z]{2})?/,
    "",
  );
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
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
