import type { Plan, PlanTier } from "@/domain/models/Plan";
import { formatCurrency } from "@/lib/formatCurrency";

export interface PlanCardLabels {
  upgrade: string;
  /** Singular noun for one seat (e.g. "seat"). Used in team interval labels. */
  seat: string;
}

export interface PlanVariantView {
  /** Display price for the card header (e.g. "$19"). */
  price: string;
  /** Interval-suffix label after the price (e.g. "month", "per seat/month"). */
  intervalLabel: string;
  /**
   * Optional sub-label shown below the price (e.g. "$19/month billed yearly").
   * Only set when it adds information beyond the headline price.
   */
  priceSubLabel?: string;
  /** Pre-rendered CTA for this variant. `null` when no CTA should be shown. */
  cta: React.ReactNode | null;
}

export interface PlanCardGroup {
  /** Stable key, e.g. "personal-pro". */
  key: string;
  /** Tier display name, e.g. "Pro". */
  name: string;
  description: string;
  highlighted: boolean;
  context: "personal" | "team";
  tier: PlanTier;
  monthly?: PlanVariantView;
  yearly?: PlanVariantView;
  /**
   * Discount percentage of the yearly variant compared to 12x monthly,
   * rounded to the nearest integer. Only set when both variants exist
   * and yearly < monthly * 12.
   */
  yearlySavingsPct?: number;
}

export interface BuildPlanCardGroupsOptions {
  plans: Plan[];
  currentPlanId?: string;
  locale: string;
  labels: PlanCardLabels;
  /**
   * Renders the call-to-action for a single plan variant. Returning `null`
   * means no CTA should be shown for that variant (e.g. it's the current plan).
   */
  renderCta: (ctx: {
    plan: Plan;
    isCurrent: boolean;
    isUpgrade: boolean;
    isTeam: boolean;
    displayAmount: number;
    currency: string;
    ctaLabel: string;
  }) => React.ReactNode;
}

const TIER_ORDER: PlanTier[] = ["free", "basic", "pro"];

/**
 * Returns the maximum yearly savings percentage across the given groups, or
 * 0 when no group has a positive savings value. Used by callers to render a
 * single "Save up to X%" badge above a section of plan cards.
 */
export function maxYearlySavingsPct(groups: PlanCardGroup[]): number {
  return groups.reduce((max, g) => Math.max(max, g.yearlySavingsPct ?? 0), 0);
}

export interface SplitPlanGroups {
  personal: PlanCardGroup[];
  team: PlanCardGroup[];
  personalSavingsPct: number;
  teamSavingsPct: number;
}

/**
 * Splits a list of plan card groups into the personal and team subsets and
 * pre-computes the "save up to X%" percentage for each subset. Callers use
 * this to render two `PricingSection`s without repeating the bookkeeping on
 * every page.
 */
export function splitPlanGroupsByContext(
  groups: PlanCardGroup[],
): SplitPlanGroups {
  const personal = groups.filter((g) => g.context === "personal");
  const team = groups.filter((g) => g.context === "team");
  return {
    personal,
    team,
    personalSavingsPct: maxYearlySavingsPct(personal),
    teamSavingsPct: maxYearlySavingsPct(team),
  };
}

function tierDisplayName(tier: PlanTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/** Monthly-equivalent display amount, used to compare across intervals. */
function monthlyEquivalent(plan: Plan): number {
  const amount = plan.price?.displayAmount ?? 0;
  return plan.interval === "year" ? amount / 12 : amount;
}

export function buildPlanCardGroups({
  plans,
  currentPlanId,
  locale,
  labels,
  renderCta,
}: BuildPlanCardGroupsOptions): PlanCardGroup[] {
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const currentMonthlyEq = currentPlan ? monthlyEquivalent(currentPlan) : 0;
  const currentContext = currentPlan?.context;

  // Group by (context, tier).
  const groups = new Map<
    string,
    { context: Plan["context"]; tier: PlanTier; plans: Plan[] }
  >();
  for (const plan of plans) {
    const key = `${plan.context}-${plan.tier}`;
    let group = groups.get(key);
    if (!group) {
      group = { context: plan.context, tier: plan.tier, plans: [] };
      groups.set(key, group);
    }
    group.plans.push(plan);
  }

  const buildVariant = (plan: Plan): PlanVariantView => {
    const displayAmount = plan.price?.displayAmount ?? 0;
    const currency = plan.price?.currency ?? "usd";
    const isTeam = plan.context === "team";
    const isCurrent = Boolean(currentPlanId) && plan.id === currentPlanId;
    const monthlyEq = monthlyEquivalent(plan);
    // Personal → team is always an upgrade regardless of price (it unlocks
    // collaboration features). Team → personal is always a downgrade. Within
    // the same context, fall back to price comparison.
    let isUpgrade: boolean;
    if (currentContext === "personal" && isTeam) {
      isUpgrade = true;
    } else if (currentContext === "team" && !isTeam) {
      isUpgrade = false;
    } else {
      isUpgrade = monthlyEq > currentMonthlyEq;
    }
    const ctaLabel = labels.upgrade;

    const intervalLabel = isTeam
      ? `${labels.seat}/${plan.interval}`
      : plan.interval;

    let priceSubLabel: string | undefined;
    if (plan.interval === "year" && displayAmount > 0) {
      const monthlyEqDisplay = displayAmount / 12;
      const formatted = formatCurrency(monthlyEqDisplay, currency, locale);
      priceSubLabel = isTeam
        ? `${formatted}/${labels.seat}/month billed yearly`
        : `${formatted}/month billed yearly`;
    }

    return {
      price: plan.price
        ? formatCurrency(displayAmount, currency, locale)
        : formatCurrency(0, currency, locale),
      intervalLabel,
      priceSubLabel,
      cta:
        renderCta({
          plan,
          isCurrent,
          isUpgrade,
          isTeam,
          displayAmount,
          currency,
          ctaLabel,
        }) ?? null,
    };
  };

  const result: PlanCardGroup[] = [];
  for (const group of groups.values()) {
    const monthlyPlan = group.plans.find((p) => p.interval === "month");
    const yearlyPlan = group.plans.find((p) => p.interval === "year");

    const monthly = monthlyPlan ? buildVariant(monthlyPlan) : undefined;
    const yearly = yearlyPlan ? buildVariant(yearlyPlan) : undefined;

    let yearlySavingsPct: number | undefined;
    if (
      monthlyPlan?.price &&
      yearlyPlan?.price &&
      monthlyPlan.price.displayAmount > 0 &&
      yearlyPlan.price.displayAmount < monthlyPlan.price.displayAmount * 12
    ) {
      const fullYear = monthlyPlan.price.displayAmount * 12;
      yearlySavingsPct = Math.round(
        (1 - yearlyPlan.price.displayAmount / fullYear) * 100,
      );
    }

    // Description: prefer the monthly variant's (yearly often has " Billed annually..." appended).
    const description =
      monthlyPlan?.description ?? yearlyPlan?.description ?? "";

    result.push({
      key: `${group.context}-${group.tier}`,
      name: tierDisplayName(group.tier),
      description,
      highlighted: group.tier === "pro",
      context: group.context,
      tier: group.tier,
      monthly,
      yearly,
      yearlySavingsPct,
    });
  }

  // Sort by tier order so Free → Basic → Pro.
  result.sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
  );

  return result;
}
