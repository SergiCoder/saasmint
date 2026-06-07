/**
 * Display currencies offered in the pricing selector, one entry per supported
 * ISO 4217 currency. Mirrors the backend's per-currency coverage (see
 * `apps/billing/vat.py` `COUNTRY_CURRENCY`).
 *
 * Why currency, not country: per-country stickers are FX-converted **per
 * currency**, so every Eurozone country shows the *same* EUR sticker — listing
 * them individually yields identical previews. The per-country VAT difference
 * (e.g. ES 21% vs DE 19%) lives only in the invisible Stripe base and is
 * resolved at checkout from the buyer's billing address, never from this
 * selector. So this dropdown is purely a sticker-preview affordance and one
 * entry per currency is sufficient.
 *
 * `country` is a representative ISO-3166-1 alpha-2 forwarded to the backend's
 * existing `?country=` catalog resolver; any member of a currency's bloc yields
 * the same sticker, so the choice is cosmetic. Adding a market to an existing
 * currency (e.g. Belgium → EUR) needs no change here.
 */
export interface PricingCurrency {
  /** ISO 4217 code, lowercase — the stable selector value (drives `?currency=`). */
  readonly code: string;
  /** Representative country the backend resolves to a per-country sticker. */
  readonly country: string;
  /** Symbol shown beside the code, e.g. "€" in "EUR €". */
  readonly symbol: string;
}

export const PRICING_CURRENCIES: readonly PricingCurrency[] = [
  { code: "eur", country: "ES", symbol: "€" },
  { code: "usd", country: "US", symbol: "$" },
  { code: "gbp", country: "GB", symbol: "£" },
  { code: "dkk", country: "DK", symbol: "kr" },
  { code: "sek", country: "SE", symbol: "kr" },
  { code: "pln", country: "PL", symbol: "zł" },
  { code: "cny", country: "CN", symbol: "¥" },
] as const;

/** Normalise a raw `?currency=` value to a supported lowercase code, or "". */
export function normalizePricingCurrency(raw: string | undefined): string {
  if (!raw) return "";
  const code = raw.trim().toLowerCase();
  return PRICING_CURRENCIES.some((c) => c.code === code) ? code : "";
}

/**
 * Representative country for a currency code, forwarded to the backend's
 * `?country=` resolver. Returns `undefined` for an unknown/empty code so the
 * caller omits the param and the backend auto-detects from locale/IP.
 */
export function pricingCountryForCurrency(code: string): string | undefined {
  return PRICING_CURRENCIES.find((c) => c.code === code)?.country;
}
