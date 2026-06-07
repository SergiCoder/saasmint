"use client";

import { useSearchParams } from "next/navigation";
import { INPUT_DEFAULT_CLASS } from "@/presentation/components/atoms/Input";
import type { PricingCurrency } from "@/domain/data/pricingCurrencies";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

export interface CurrencySelectorProps {
  /** Accessible label (e.g. "Currency"). */
  label: string;
  /** Currently-selected ISO 4217 code (lowercase) — always a real currency. */
  selected: string;
  /** Offered currencies, rendered in the given order. */
  currencies: readonly PricingCurrency[];
}

/**
 * Manual pricing-currency override. Selecting a currency navigates to the same
 * page with `?currency=xxx` (preserving other params). There is no explicit
 * auto-detect entry: on first load the page pre-selects the currency the
 * backend resolved from locale/IP, and the user overrides from there. The
 * choice only drives which sticker is previewed — the tax actually charged is
 * resolved at checkout from the buyer's billing address.
 */
export function CurrencySelector({
  label,
  selected,
  currencies,
}: CurrencySelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("currency", event.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-600">
      <span>{label}</span>
      <select
        value={selected}
        onChange={onChange}
        className={INPUT_DEFAULT_CLASS}
        aria-label={label}
      >
        {currencies.map(({ code, symbol }) => (
          <option key={code} value={code}>
            {`${code.toUpperCase()} ${symbol}`}
          </option>
        ))}
      </select>
    </label>
  );
}
