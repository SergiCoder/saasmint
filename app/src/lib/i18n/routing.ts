import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: [
    "en",
    "es",
    "fr",
    "de",
    "pt-BR",
    "it",
    "ja",
    "zh-CN",
    "nl",
    "ar",
    "ko",
    "ru",
    "pl",
    "tr",
    "sv",
    "id",
    "zh-TW",
    "da",
    "nb",
    "pt-PT",
  ],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (routing.locales as readonly string[]).includes(value)
  );
}

// Sorted longest-first so "pt-BR" matches before "pt" would. Hoisted to
// module scope because the locale list is a compile-time constant — no
// need to re-sort on every request.
const LOCALES_BY_LENGTH_DESC: readonly string[] = [...routing.locales].sort(
  (a, b) => b.length - a.length,
);

/**
 * Strips the locale prefix from a pathname.
 * "/en/dashboard" → "/dashboard", "/pt-BR" → "/", "/other" → "/other".
 * Edge-safe: no `next/headers` or runtime-specific imports.
 */
export function stripLocalePrefix(pathname: string): string {
  const prefix = LOCALES_BY_LENGTH_DESC.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
  );
  if (!prefix) return pathname;
  const stripped = pathname.slice(prefix.length + 1);
  return stripped === "" ? "/" : stripped;
}
