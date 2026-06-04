import { PlanCard } from "../molecules/PlanCard";
import { Badge } from "../atoms/Badge";
import { PricingIntervalSwitch } from "./PricingIntervalSwitch";
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
  /** Currently-selected billing interval (driven by the page's search params). */
  selectedInterval: "month" | "year";
  /** URL for the monthly tab. */
  monthlyHref: string;
  /** URL for the yearly tab. */
  yearlyHref: string;
  className?: string;
}

export function PricingSection({
  title,
  description,
  groups,
  labels,
  savingsBadge,
  selectedInterval,
  monthlyHref,
  yearlyHref,
  className = "",
}: PricingSectionProps) {
  if (groups.length === 0) return null;

  const gridColsClass =
    groups.length >= 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : groups.length === 2
        ? "sm:grid-cols-2"
        : "";
  const gridMaxWidthClass =
    groups.length >= 3
      ? "max-w-5xl"
      : groups.length === 2
        ? "max-w-3xl"
        : "max-w-md";

  const gridClassName = `mx-auto grid gap-8 ${gridMaxWidthClass} ${gridColsClass}`;

  const pickYearly = selectedInterval === "year";
  const grid = (
    <div className={gridClassName}>
      {groups.map((group) => {
        const variant = pickYearly
          ? (group.yearly ?? group.monthly)
          : (group.monthly ?? group.yearly);
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
  );

  return (
    <section className={`space-y-8 ${className}`}>
      <PricingIntervalSwitch
        selectedInterval={selectedInterval}
        ariaLabel={title}
        monthlyLabel={labels.monthly}
        yearlyLabel={labels.yearly}
        monthlyHref={monthlyHref}
        yearlyHref={yearlyHref}
        header={
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
        }
        savingsBadge={
          savingsBadge ? (
            <Badge variant="success">{savingsBadge}</Badge>
          ) : undefined
        }
        grid={grid}
      />
    </section>
  );
}
