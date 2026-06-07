/**
 * Pricing markets offered in the manual country selector (ISO 3166-1 alpha-2).
 *
 * Mirrors the backend's per-country price coverage (see `apps/billing/vat.py`
 * `COUNTRY_CURRENCY`). The backend still accepts any `?country=` and falls back
 * to the USD anchor for codes without a per-country price, so this list only
 * bounds what the selector offers — it is not a correctness constraint. Keep it
 * in rough sync with the backend launch markets.
 */
export const PRICING_COUNTRIES: readonly string[] = [
  "US",
  "GB",
  "ES",
  "FR",
  "DE",
  "IT",
  "NL",
  "PT",
  "IE",
  "PL",
  "SE",
  "DK",
  "CN",
] as const;
