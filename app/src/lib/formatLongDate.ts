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

const getFormatter = createFormatterCache<Intl.DateTimeFormat>(200, (key) => {
  const [dateStyle, locale] = key.split("|") as [DateStyle, string];
  return new Intl.DateTimeFormat(locale, { dateStyle });
});

function formatDate(date: Date, locale: string, dateStyle: DateStyle): string {
  return Number.isNaN(date.getTime())
    ? ""
    : getFormatter(`${dateStyle}|${locale}`).format(date);
}

/** Formats `date` as a locale-aware long date (e.g. "January 1, 2026"). */
export function formatLongDate(date: Date, locale: string): string {
  return formatDate(date, locale, "long");
}

/** Formats `date` as a locale-aware medium date (e.g. "Jan 1, 2026"). */
export function formatMediumDate(date: Date, locale: string): string {
  return formatDate(date, locale, "medium");
}
