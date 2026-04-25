import { routing } from "@/lib/i18n/routing";

export const OAUTH_NEXT_ALLOWLIST = [
  "/dashboard",
  "/subscription/checkout",
  "/subscription/team-checkout",
] as const;

export const OAUTH_NEXT_FALLBACK = "/dashboard";

function stripLocale(pathname: string): string {
  const segments = pathname.split("/");
  const candidate = segments[1];
  if (candidate && (routing.locales as readonly string[]).includes(candidate)) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
}

function normalizeTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function validateNext(
  candidate: string | undefined | null,
  origin: string,
): string {
  if (!candidate || typeof candidate !== "string") return OAUTH_NEXT_FALLBACK;

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\")
  ) {
    return OAUTH_NEXT_FALLBACK;
  }

  let url: URL;
  try {
    url = new URL(candidate, origin);
  } catch {
    return OAUTH_NEXT_FALLBACK;
  }

  if (url.origin !== origin) return OAUTH_NEXT_FALLBACK;

  const pathname = normalizeTrailingSlash(stripLocale(url.pathname));
  if (!(OAUTH_NEXT_ALLOWLIST as readonly string[]).includes(pathname)) {
    return OAUTH_NEXT_FALLBACK;
  }

  return url.pathname + url.search + url.hash;
}
