/**
 * Formats `date` as a locale-aware long date (e.g. "January 1, 2026").
 *
 * Returns an empty string for invalid dates so callers can pass through
 * `new Date(maybeIso)` without explicit NaN checks.
 */
export function formatLongDate(date: Date, locale: string): string {
  return !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date)
    : "";
}
