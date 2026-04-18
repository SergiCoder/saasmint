"use client";

import { useState, type ReactNode } from "react";

export interface PricingIntervalSwitchProps {
  defaultInterval: "month" | "year";
  ariaLabel: string;
  monthlyLabel: string;
  yearlyLabel: string;
  header: ReactNode;
  savingsBadge?: ReactNode;
  monthlyGrid: ReactNode;
  yearlyGrid: ReactNode;
}

function toggleClass(selected: boolean): string {
  return `cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    selected
      ? "bg-primary-600 text-white"
      : "text-gray-600 hover:text-gray-900"
  }`;
}

export function PricingIntervalSwitch({
  defaultInterval,
  ariaLabel,
  monthlyLabel,
  yearlyLabel,
  header,
  savingsBadge,
  monthlyGrid,
  yearlyGrid,
}: PricingIntervalSwitchProps) {
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">(
    defaultInterval,
  );

  return (
    <>
      <div className="space-y-4 text-center">
        {header}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div
            role="tablist"
            aria-label={ariaLabel}
            className="inline-flex rounded-full border border-gray-200 bg-white p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedInterval === "month"}
              onClick={() => setSelectedInterval("month")}
              className={toggleClass(selectedInterval === "month")}
            >
              {monthlyLabel}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedInterval === "year"}
              onClick={() => setSelectedInterval("year")}
              className={toggleClass(selectedInterval === "year")}
            >
              {yearlyLabel}
            </button>
          </div>
          {savingsBadge}
        </div>
      </div>

      <div className={selectedInterval === "month" ? "" : "hidden"}>{monthlyGrid}</div>
      <div className={selectedInterval === "year" ? "" : "hidden"}>{yearlyGrid}</div>
    </>
  );
}
