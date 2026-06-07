"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { INPUT_DEFAULT_CLASS } from "@/presentation/components/atoms/Input";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

export interface CountrySelectorProps {
  /** Accessible label (e.g. "Country"). */
  label: string;
  /** Currently-selected ISO-3166-1 alpha-2 code, or "" for auto-detect. */
  selected: string;
  /** Offered ISO-3166-1 alpha-2 codes. */
  countries: readonly string[];
  /** Active locale, used to localise country names via Intl.DisplayNames. */
  locale: string;
  /** Label for the "auto-detect" option (resolved from locale/IP server-side). */
  autoLabel: string;
}

/**
 * Manual pricing-country override. Selecting a country navigates to the same
 * page with `?country=XX` (preserving other params); selecting auto-detect
 * drops the param so the backend resolves country from locale/IP. The chosen
 * country drives the tax-inclusive sticker shown on the catalog.
 */
export function CountrySelector({
  label,
  selected,
  countries,
  locale,
  autoLabel,
}: CountrySelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Localised country names, sorted alphabetically in the active locale.
  const options = useMemo(() => {
    const display = new Intl.DisplayNames([locale], { type: "region" });
    return countries
      .map((code) => ({ code, name: display.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [countries, locale]);

  function onChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const next = event.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("country", next);
    } else {
      params.delete("country");
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
        {options.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
