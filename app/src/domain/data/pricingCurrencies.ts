/**
 * Display currencies offered in the pricing selector — the full set the backend
 * supports (`SUPPORTED_CURRENCIES` in `saasmint_core/services/currency.py`,
 * also exposed by `GET /billing/currencies/`).
 *
 * Two pricing mechanisms back these, chosen per currency by `country`:
 *
 * - **Launch markets** (`country` set) have a per-country, tax-**inclusive**
 *   sticker (e.g. €17.99 incl. VAT). Selecting them forwards `?country=<rep>` so
 *   the backend returns that sticker. Every Eurozone member shares one EUR
 *   entry — FX conversion is per-currency, so they'd show identical previews;
 *   the per-country VAT difference lives in the (invisible) Stripe base and is
 *   resolved at checkout from the buyer's address.
 * - **Display-only currencies** (`country` absent) have no per-country sticker.
 *   Selecting them forwards `?currency=<code>` for the FX-converted, tax-
 *   **exclusive** price (charged natively when billable, in USD otherwise).
 *
 * Keep this list in sync with the backend's `SUPPORTED_CURRENCIES`; `country`
 * mirrors `COUNTRY_CURRENCY` (`apps/billing/vat.py`). Ordered alphabetically by
 * code for findability in the native `<select>`.
 */
export interface PricingCurrency {
  /** ISO 4217 code, lowercase — the selector value and `?currency=` value. */
  readonly code: string;
  /** Symbol shown beside the code, e.g. "€" in "EUR €". */
  readonly symbol: string;
  /**
   * Representative country for a launch market with a per-country tax-inclusive
   * sticker. When set, the selection forwards `?country=` instead of
   * `?currency=`. Absent for display-only (FX, tax-exclusive) currencies.
   */
  readonly country?: string;
}

export const PRICING_CURRENCIES: readonly PricingCurrency[] = [
  { code: "aed", symbol: "Dh" },
  { code: "aud", symbol: "A$" },
  { code: "brl", symbol: "R$" },
  { code: "cad", symbol: "C$" },
  { code: "chf", symbol: "Fr" },
  { code: "cny", symbol: "¥", country: "CN" },
  { code: "dkk", symbol: "kr", country: "DK" },
  { code: "eur", symbol: "€", country: "ES" },
  { code: "gbp", symbol: "£", country: "GB" },
  { code: "idr", symbol: "Rp" },
  { code: "jpy", symbol: "¥" },
  { code: "krw", symbol: "₩" },
  { code: "nok", symbol: "kr" },
  { code: "pln", symbol: "zł", country: "PL" },
  { code: "rub", symbol: "₽" },
  { code: "sar", symbol: "SR" },
  { code: "sek", symbol: "kr", country: "SE" },
  { code: "try", symbol: "₺" },
  { code: "twd", symbol: "NT$" },
  { code: "usd", symbol: "$", country: "US" },
] as const;

/** Normalise a raw currency value to a supported lowercase code, or "". */
export function normalizePricingCurrency(raw: string | undefined): string {
  if (!raw) return "";
  const code = raw.trim().toLowerCase();
  return PRICING_CURRENCIES.some((c) => c.code === code) ? code : "";
}

/**
 * Catalog query params for a chosen currency. Launch markets resolve to
 * `?country=` (tax-inclusive sticker); display-only currencies to `?currency=`
 * (FX price). An unknown/empty code yields `{}` so the caller omits both and
 * the backend auto-detects the market from locale/IP.
 */
export function catalogParamsForCurrency(code: string): {
  currency?: string;
  country?: string;
} {
  const entry = PRICING_CURRENCIES.find((c) => c.code === code);
  if (!entry) return {};
  return entry.country ? { country: entry.country } : { currency: entry.code };
}
