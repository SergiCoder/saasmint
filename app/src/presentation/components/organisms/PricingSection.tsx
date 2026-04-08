"use client";

import { useState } from "react";
import { PlanCard } from "../molecules/PlanCard";
import { Badge } from "../atoms/Badge";
import type { PlanCardGroup } from "@/app/[locale]/_lib/buildPlanCards";

export interface PricingSectionLabels {
  monthly: string;
  yearly: string;
}

export interface PricingSectionProps {
  title: string;
  description?: string;
  groups: PlanCardGroup[];
  labels: PricingSectionLabels;
  /**
   * Pre-formatted savings badge text (e.g. "Save up to 17%"). When provided
   * and non-empty, the badge is shown next to the yearly toggle.
   */
  savingsBadge?: string;
  /** Initial billing interval. Defaults to "month". */
  defaultInterval?: "month" | "year";
  className?: string;
}

export function PricingSection({
  title,
  description,
  groups,
  labels,
  savingsBadge,
  defaultInterval = "month",
  className = "",
}: PricingSectionProps) {
  const [interval, setInterval] = useState<"month" | "year">(defaultInterval);

  if (groups.length === 0) return null;

  const showSavingsBadge = Boolean(savingsBadge);

  // Adapt grid columns to the number of cards so 2-card sections don't leave
  // an empty third column on wide screens.
  const gridColsClass =
    groups.length >= 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : groups.length === 2
        ? "sm:grid-cols-2"
        : "";
  // Constrain max-width so two cards don't stretch edge-to-edge.
  const gridMaxWidthClass =
    groups.length >= 3
      ? "max-w-5xl"
      : groups.length === 2
        ? "max-w-3xl"
        : "max-w-md";

  return (
    <section className={`space-y-8 ${className}`}>
      <div className="space-y-4 text-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div
            role="tablist"
            aria-label={title}
            className="inline-flex rounded-full border border-gray-200 bg-white p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={interval === "month"}
              onClick={() => setInterval("month")}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                interval === "month"
                  ? "bg-primary-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {labels.monthly}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={interval === "year"}
              onClick={() => setInterval("year")}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                interval === "year"
                  ? "bg-primary-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {labels.yearly}
            </button>
          </div>
          {showSavingsBadge && <Badge variant="success">{savingsBadge}</Badge>}
        </div>
      </div>

      <div
        className={`mx-auto grid gap-8 ${gridMaxWidthClass} ${gridColsClass}`}
      >
        {groups.map((group) => {
          const variant =
            (interval === "year" ? group.yearly : group.monthly) ??
            group.monthly ??
            group.yearly;
          if (!variant) return null;

          return (
            <PlanCard
              key={group.key}
              name={group.name}
              price={variant.price}
              interval={variant.intervalLabel}
              priceSubLabel={variant.priceSubLabel}
              description={group.description}
              highlighted={group.highlighted}
              cta={variant.cta ?? <span />}
            />
          );
        })}
      </div>
    </section>
  );
}
