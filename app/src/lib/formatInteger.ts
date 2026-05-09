import { createFormatterCache } from "./formatterCache";

/**
 * Shared Intl.NumberFormat cache for plain (non-currency) integer formatting,
 * keyed by locale. Mirrors the cache pattern in `formatCurrency.ts` so credit
 * balances, member counts, and similar integer renders don't allocate a fresh
 * formatter per call.
 */
const getFormatter = createFormatterCache<Intl.NumberFormat>(
  200,
  (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
);

/** Format an integer with locale-aware thousand separators. */
export function formatInteger(value: number, locale: string): string {
  return getFormatter(locale).format(value);
}
