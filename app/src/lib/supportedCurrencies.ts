/**
 * Currency codes the user may set as their `preferredCurrency`. Mirrors
 * the option list rendered by `ProfileForm`'s currency dropdown — both the
 * client picker and the `updateProfile` server action validate against
 * this allowlist before forwarding the value to the backend.
 */
export const SUPPORTED_CURRENCY_CODES = [
  "usd",
  "eur",
  "gbp",
  "cad",
  "aud",
  "chf",
  "jpy",
  "cny",
  "twd",
  "krw",
  "brl",
  "sek",
  "nok",
  "dkk",
  "pln",
  "try",
  "idr",
  "rub",
  "sar",
  "aed",
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number];

const SUPPORTED_CURRENCY_SET: ReadonlySet<string> = new Set(
  SUPPORTED_CURRENCY_CODES,
);

export function isSupportedCurrency(value: string): boolean {
  return SUPPORTED_CURRENCY_SET.has(value);
}
