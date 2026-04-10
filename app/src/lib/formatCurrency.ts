/**
 * Shared Intl.NumberFormat cache keyed by "locale|CURRENCY|maxFrac".
 * Constructing a NumberFormat is expensive; caching avoids repeated allocation
 * when formatting many prices in a single render (plan cards, product grids).
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(
  locale: string,
  currency: string,
  maxFractionDigits: number,
): Intl.NumberFormat {
  const key = `${locale}|${currency}|${maxFractionDigits}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFractionDigits,
    });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

/**
 * Format a display amount as a locale-aware currency string.
 *
 * Fractional digits are suppressed for whole amounts (e.g. "$19" not "$19.00")
 * and shown with up to two decimals otherwise.
 */
export function formatCurrency(
  displayAmount: number,
  currency: string,
  locale: string,
): string {
  const maxFrac = displayAmount % 1 === 0 ? 0 : 2;
  return getFormatter(locale, currency, maxFrac).format(displayAmount);
}
