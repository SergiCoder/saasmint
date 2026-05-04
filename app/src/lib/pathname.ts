import { headers } from "next/headers";
import {
  isLocale,
  routing,
  stripLocalePrefix,
  type Locale,
} from "@/lib/i18n/routing";

export const PATHNAME_HEADER = "x-pathname";

/**
 * Returns the current request pathname (including the locale prefix, e.g.
 * "/en/dashboard"). Available in server components because the proxy
 * middleware forwards the pathname as a request header.
 */
export async function getPathname(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get(PATHNAME_HEADER) ?? "/";
}

/**
 * Returns the current request pathname with the locale prefix stripped
 * (e.g. "/en/dashboard" → "/dashboard", "/es" → "/"). Useful when matching
 * against locale-independent routes such as nav links.
 */
export async function getPathnameWithoutLocale(): Promise<string> {
  return stripLocalePrefix(await getPathname());
}

/**
 * Resolves the active locale for the current request. Reads the locale from
 * the pathname forwarded by the proxy middleware; falls back to the default
 * locale when the pathname has no recognised prefix. Use in server actions
 * that need to build locale-prefixed redirects — `redirect("/dashboard")`
 * loses the locale and breaks the next-intl + Next.js client router on
 * cross-redirect chains.
 */
export async function getLocale(): Promise<Locale> {
  const pathname = await getPathname();
  const segment = pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : routing.defaultLocale;
}
