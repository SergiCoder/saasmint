import { createFormatterCache } from "./formatterCache";

/**
 * Shared Intl.NumberFormat cache keyed by "locale|CURRENCY".
 * Constructing a NumberFormat is expensive; caching avoids repeated allocation
 * when formatting many prices in a single render (plan cards, product grids).
 *
 * The cap protects long-running server processes from unbounded growth if the
 * locale/currency surface ever expands or a malformed input pair sneaks past
 * upstream validation. Size is well above the realistic working set
 * (≈20 locales × ≈20 currencies = 400) so steady-state behaviour is the
 * same as before; the eviction only kicks in pathologically.
 */
const getFormatter = createFormatterCache<Intl.NumberFormat>(1000, (key) => {
  const [locale, currency] = key.split("|");
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: (currency ?? "USD").toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
});

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
  return getFormatter(`${locale}|${currency}`).format(displayAmount);
}
