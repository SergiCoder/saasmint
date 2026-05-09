import { createFormatterCache } from "./formatterCache";

/**
 * Locale-aware date formatters.
 *
 * `Intl.DateTimeFormat` is non-trivial to construct (allocates an internal
 * locale data instance), so the two style-specific helpers share a single
 * memoised formatter cache keyed on `${style}|${locale}`. Returning an empty
 * string for invalid dates lets callers pass through `new Date(maybeIso)`
 * without explicit NaN checks.
 */

type DateStyle = Extract<
  Intl.DateTimeFormatOptions["dateStyle"],
  "long" | "medium"
>;

// Per-style formatter caches. Splitting by `dateStyle` keeps each cache
// keyed by a single locale string, so the factory never has to parse a
// composite key — eliminates the unsound `key.split("|") as [DateStyle,
// string]` tuple cast the previous design required.
const longFormatterCache = createFormatterCache<Intl.DateTimeFormat>(
  200,
  (locale) => new Intl.DateTimeFormat(locale, { dateStyle: "long" }),
);
const mediumFormatterCache = createFormatterCache<Intl.DateTimeFormat>(
  200,
  (locale) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
);

function formatDate(date: Date, locale: string, dateStyle: DateStyle): string {
  if (Number.isNaN(date.getTime())) return "";
  const formatter =
    dateStyle === "long"
      ? longFormatterCache(locale)
      : mediumFormatterCache(locale);
  return formatter.format(date);
}

/** Formats `date` as a locale-aware long date (e.g. "January 1, 2026"). */
export function formatLongDate(date: Date, locale: string): string {
  return formatDate(date, locale, "long");
}

/** Formats `date` as a locale-aware medium date (e.g. "Jan 1, 2026"). */
export function formatMediumDate(date: Date, locale: string): string {
  return formatDate(date, locale, "medium");
}
