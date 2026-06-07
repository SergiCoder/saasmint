"use client";

import { useSearchParams } from "next/navigation";
import { INPUT_DEFAULT_CLASS } from "@/presentation/components/atoms/Input";
import type { PricingCurrency } from "@/domain/data/pricingCurrencies";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

export interface CurrencySelectorProps {
  /** Accessible label (e.g. "Currency"). */
  label: string;
  /** Currently-selected ISO 4217 code (lowercase), or "" for auto-detect. */
  selected: string;
  /** Offered currencies, rendered in the given order. */
  currencies: readonly PricingCurrency[];
  /** Label for the "auto-detect" option (resolved from locale/IP server-side). */
  autoLabel: string;
}

/**
 * Manual pricing-currency override. Selecting a currency navigates to the same
 * page with `?currency=xxx` (preserving other params); selecting auto-detect
 * drops the param so the backend resolves the market from locale/IP. The choice
 * only drives which tax-inclusive sticker is previewed — the VAT actually
 * charged is resolved at checkout from the buyer's billing address.
 */
export function CurrencySelector({
  label,
  selected,
  currencies,
  autoLabel,
}: CurrencySelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const next = event.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("currency", next);
    } else {
      params.delete("currency");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
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
        <option value="">{autoLabel}</option>
        {currencies.map(({ code, symbol }) => (
          <option key={code} value={code}>
            {`${code.toUpperCase()} ${symbol}`}
          </option>
        ))}
      </select>
    </label>
  );
}
