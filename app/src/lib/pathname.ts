import { headers } from "next/headers";
import { stripLocalePrefix } from "@/lib/i18n/routing";

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
