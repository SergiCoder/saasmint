export type PricingInterval = "month" | "year";

/**
 * Parses a raw `interval` search-param value into the typed union. Anything
 * outside `"month" | "year"` (including `undefined`) falls back to the given
 * default so a malformed URL never widens the type.
 */
export function parseIntervalParam(
  raw: string | undefined,
  fallback: PricingInterval = "month",
): PricingInterval {
  return raw === "year" || raw === "month" ? raw : fallback;
}

/** URL hrefs for the interval tabs on the marketing pricing page. */
export const PRICING_INTERVAL_HREFS = {
  monthlyHref: "/pricing?interval=month",
  yearlyHref: "/pricing?interval=year",
} as const;

/** URL hrefs for the interval tabs on the app subscription page. */
export const SUBSCRIPTION_INTERVAL_HREFS = {
  monthlyHref: "/subscription?interval=month",
  yearlyHref: "/subscription?interval=year",
} as const;
