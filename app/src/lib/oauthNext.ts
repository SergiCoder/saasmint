import { routing } from "@/lib/i18n/routing";
import { isMemberOf } from "@/lib/typeGuards";

export const OAUTH_NEXT_ALLOWLIST = [
  "/dashboard",
  "/subscription/checkout",
  "/subscription/team-checkout",
] as const;

export const OAUTH_NEXT_FALLBACK = "/dashboard";

// Per-path allowlist of query params permitted to survive validation. Anything
// not listed is dropped so an attacker can't smuggle arbitrary `?utm_…`-style
// keys (or other side-channel data) through the OAuth `next` cookie.
const ALLOWED_QUERY_PARAMS: Readonly<Record<string, readonly string[]>> = {
  "/subscription/checkout": ["plan"],
  "/subscription/team-checkout": ["plan"],
};

function stripLocale(pathname: string): string {
  const segments = pathname.split("/");
  const candidate = segments[1];
  if (candidate && isMemberOf(routing.locales, candidate)) {
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

function buildSafeSearch(
  url: URL,
  pathname: keyof typeof ALLOWED_QUERY_PARAMS | string,
): string {
  const allowed = ALLOWED_QUERY_PARAMS[pathname];
  if (!allowed) return "";
  const safe = new URLSearchParams();
  for (const key of allowed) {
    const value = url.searchParams.get(key);
    if (value !== null) safe.set(key, value);
  }
  const search = safe.toString();
  return search ? `?${search}` : "";
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

  const normalisedPath = normalizeTrailingSlash(stripLocale(url.pathname));
  if (!isMemberOf(OAUTH_NEXT_ALLOWLIST, normalisedPath)) {
    return OAUTH_NEXT_FALLBACK;
  }

  // Hash is dropped entirely — `router.replace` would otherwise honour
  // attacker-controlled fragments. Query string is rebuilt from the per-path
  // allowlist; everything else is discarded.
  return url.pathname + buildSafeSearch(url, normalisedPath);
}
