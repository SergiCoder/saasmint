import type { ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";

export interface PricingIntervalSwitchProps {
  selectedInterval: "month" | "year";
  ariaLabel: string;
  monthlyLabel: string;
  yearlyLabel: string;
  /** URL for the monthly tab (typically current path with ?interval=month). */
  monthlyHref: string;
  /** URL for the yearly tab. */
  yearlyHref: string;
  header: ReactNode;
  savingsBadge?: ReactNode;
  /**
   * Grid for the selected interval only. The non-selected grid is *not*
   * rendered — toggling navigates to the other URL and the server renders
   * the opposite grid from scratch. Halves the HTML payload compared to
   * the previous "render both, CSS-hide one" design.
   */
  grid: ReactNode;
}

function toggleClass(selected: boolean): string {
  return `cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    selected ? "bg-primary-600 text-white" : "text-gray-600 hover:text-gray-900"
  }`;
}

export function PricingIntervalSwitch({
  selectedInterval,
  ariaLabel,
  monthlyLabel,
  yearlyLabel,
  monthlyHref,
  yearlyHref,
  header,
  savingsBadge,
  grid,
}: PricingIntervalSwitchProps) {
  return (
    <>
      <div className="space-y-4 text-center">
        {header}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/*
            prefetch={false}: toggling is same-path different-search-param,
            and the server render fans out to 6+ Django calls on the
            authed subscription page. Default prefetch would refetch the
            opposite-interval grid on hover/visibility even when the user
            never toggles, erasing most of the single-grid payload win.
          */}
          <div
            role="tablist"
            aria-label={ariaLabel}
            className="inline-flex rounded-full border border-gray-200 bg-white p-1"
          >
            <Link
              role="tab"
              aria-selected={selectedInterval === "month"}
              href={monthlyHref}
              replace
              scroll={false}
              prefetch={false}
              className={toggleClass(selectedInterval === "month")}
            >
              {monthlyLabel}
            </Link>
            <Link
              role="tab"
              aria-selected={selectedInterval === "year"}
              href={yearlyHref}
              replace
              scroll={false}
              prefetch={false}
              className={toggleClass(selectedInterval === "year")}
            >
              {yearlyLabel}
            </Link>
          </div>
          {savingsBadge}
        </div>
      </div>
      {grid}
    </>
  );
}
