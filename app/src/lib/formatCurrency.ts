/**
 * Shared Intl.NumberFormat cache keyed by "locale|CURRENCY".
 * Constructing a NumberFormat is expensive; caching avoids repeated allocation
 * when formatting many prices in a single render (plan cards, product grids).
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}|${currency}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

/**
 * Format a display amount as a locale-aware currency string.
 *
 * Always renders exactly two fractional digits — whole amounts become
 * `$19.00`, trailing-zero decimals become `$199.90`, and amounts with
 * more precision are half-expand rounded (`$19.999` → `$20.00`). Keeps
 * price displays visually aligned across plan cards and product grids.
 */
export function formatCurrency(
  displayAmount: number,
  currency: string,
  locale: string,
): string {
  return getFormatter(locale, currency).format(displayAmount);
}
