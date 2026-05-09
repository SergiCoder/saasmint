/**
 * Shared Intl.NumberFormat cache for plain (non-currency) integer formatting,
 * keyed by locale. Mirrors the cache pattern in `formatCurrency.ts` so credit
 * balances, member counts, and similar integer renders don't allocate a fresh
 * formatter per call.
 */
const FORMATTER_CACHE_MAX = 200;
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string): Intl.NumberFormat {
  let fmt = formatterCache.get(locale);
  if (!fmt) {
    if (formatterCache.size >= FORMATTER_CACHE_MAX) {
      formatterCache.clear();
    }
    fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    formatterCache.set(locale, fmt);
  }
  return fmt;
}

/** Format an integer with locale-aware thousand separators. */
export function formatInteger(value: number, locale: string): string {
  return getFormatter(locale).format(value);
}
