import type { Plan, PlanTier } from "@/domain/models/Plan";
import { PLAN_TIER_PRO } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";
import { formatCurrency } from "@/lib/formatCurrency";
import type { DynamicPlanKey } from "@/lib/i18n/planTranslation";

/**
 * Build translated plan name / description maps keyed by `"{context}.{tier}"`.
 * Consumers pass their typed `tPlans` directly; the `(key: never) => string`
 * parameter accepts any typed next-intl translator (never is the bottom
 * type) and localises the dynamic-key `as never` cast to this helper. The
 * `satisfies DynamicPlanKey` checks keep the constructed key strings in sync
 * with the documented key union so a future tier or context addition is
 * caught at compile time.
 */
export function buildPlanTranslations(
  plans: Plan[],
  tPlans: (key: never) => string,
): {
  planNames: Record<string, string>;
  planDescriptions: Record<string, string>;
} {
  const planNames: Record<string, string> = {};
  const planDescriptions: Record<string, string> = {};
  for (const plan of plans) {
    const key = `${plan.context}.${plan.tier}`;
    if (!planNames[key]) {
      const nameKey =
        `${plan.context}.${plan.tier}.name` satisfies DynamicPlanKey;
      const descKey =
        `${plan.context}.${plan.tier}.description` satisfies DynamicPlanKey;
      planNames[key] = tPlans(nameKey as never);
      planDescriptions[key] = tPlans(descKey as never);
    }
  }
  return { planNames, planDescriptions };
}

/**
 * Documented union of dynamic message keys read by buildProductTranslations.
 * Products are keyed by their integer credit count; bumping this when a new
 * SKU lands keeps the helper honest at compile time. New entries must match
 * the keys present in `messages/<locale>.json` under the `products` namespace.
 */
export type DynamicProductKey = `${number}`;

/**
 * Build the translated product name map keyed by credit count. Used by the
 * `ProductsGrid` `productNames` prop on both the subscription and marketing
 * pricing pages.
 */
export function buildProductTranslations(
  products: Product[],
  tProducts: (key: never) => string,
): Record<number, string> {
  return Object.fromEntries(
    products.map((p) => {
      const key = `${p.credits}` satisfies DynamicProductKey;
      return [p.credits, tProducts(key as never)];
    }),
  );
}

/**
 * Returns the `formatPriceSubLabelLocal` callback shape `buildPlanCardGroups`
 * expects, wired to the caller's typed translator. Both the marketing
 * pricing page and the subscription page need the exact same dispatch on
 * `interval`, so the factory keeps the logic in one place.
 */
export function makeLocalSubLabelFormatter(
  t: (
    key: "billedInLocalMonthly" | "billedInLocalYearly",
    values: Record<string, string>,
  ) => string,
): (ctx: {
  interval: "month" | "year";
  localAmount: string;
  monthlyEquivalent: string;
  billedCurrency: string;
}) => string {
  return ({ interval, localAmount, monthlyEquivalent, billedCurrency }) =>
    interval === "year"
      ? t("billedInLocalYearly", {
          amount: localAmount,
          monthly: monthlyEquivalent,
          currency: billedCurrency,
        })
      : t("billedInLocalMonthly", {
          amount: localAmount,
          currency: billedCurrency,
        });
}

/**
 * Build a `productId → priceSubLabel` map for the dual-currency disclosure
 * shown beneath one-time product prices. Only emits an entry when the
 * backend returned a non-null `localCurrency` that differs from the billed
 * currency; products without a price or with matching currencies are
 * omitted.
 */
export function buildProductPriceSubLabels(
  products: Product[],
  locale: string,
  format: (params: { localAmount: string; billedCurrency: string }) => string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const product of products) {
    const price = product.price;
    if (!price) continue;
    const { localDisplayAmount, localCurrency, currency } = price;
    if (
      localDisplayAmount === null ||
      localCurrency === null ||
      localCurrency.toLowerCase() === currency.toLowerCase()
    ) {
      continue;
    }
    out[product.id] = format({
      localAmount: formatCurrency(localDisplayAmount, localCurrency, locale),
      billedCurrency: currency.toUpperCase(),
    });
  }
  return out;
}

export interface PlanCardLabels {
  upgrade: string;
  /** Singular noun for one seat (e.g. "seat"). Used in team interval labels. */
  seat: string;
  /**
   * Localised "billed yearly" suffix. Used as a fallback for the yearly
   * sub-label when no `formatPriceSubLabelLocal` is provided (i.e. when the
   * user's preferred currency matches the billed currency).
   */
  billedYearly: string;
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
  /**
   * The user's currently-active plans (0–2 entries — concurrent personal+team
   * is allowed per rule 5). Used to mark each card as `isCurrent` and to
   * compute `isUpgrade` against the matching-context current plan.
   */
  currentPlans?: Plan[];
  locale: string;
  /**
   * Currency used to format priceless plans (e.g. the synthesised personal-free
   * card on the marketing page). When omitted, falls back to USD — keep the
   * same currency the surrounding paid plans use to avoid mixed-currency rows.
   */
  fallbackCurrency?: string;
  labels: PlanCardLabels;
  /** Translated plan names keyed by "{context}.{tier}", e.g. "personal.1". */
  planNames: Record<string, string>;
  /** Translated plan descriptions keyed by "{context}.{tier}". */
  planDescriptions: Record<string, string>;
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
  /**
   * Composes the price sub-label when the user's preferred currency differs
   * from the billed one. Receives pre-formatted amounts so callers only need
   * to weave them into a localised template (`billedInLocalMonthly` /
   * `billedInLocalYearly`). When omitted, the helper falls back to the
   * monolingual yearly sub-label and renders nothing for monthly.
   */
  formatPriceSubLabelLocal?: (ctx: {
    interval: "month" | "year";
    isTeam: boolean;
    localAmount: string;
    monthlyEquivalent: string;
    billedCurrency: string;
  }) => string;
}

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

/** Monthly-equivalent display amount, used to compare across intervals. */
function monthlyEquivalent(plan: Plan): number {
  const amount = plan.price?.displayAmount ?? 0;
  return plan.interval === "year" ? amount / 12 : amount;
}

export function buildPlanCardGroups({
  plans,
  currentPlans = [],
  locale,
  fallbackCurrency,
  labels,
  planNames,
  planDescriptions,
  renderCta,
  formatPriceSubLabelLocal,
}: BuildPlanCardGroupsOptions): PlanCardGroup[] {
  const currentPlanIds = new Set(currentPlans.map((p) => p.id));
  const currentByContext: Record<Plan["context"], Plan | undefined> = {
    personal: currentPlans.find((p) => p.context === "personal"),
    team: currentPlans.find((p) => p.context === "team"),
  };

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
    const currency = plan.price?.currency ?? fallbackCurrency ?? "usd";
    const isTeam = plan.context === "team";
    const isCurrent = currentPlanIds.has(plan.id);
    const monthlyEq = monthlyEquivalent(plan);
    // Compare each candidate against the user's current plan in the SAME
    // context (concurrent personal+team are independent ladders). When the
    // user has no plan in that context yet, treat any priced option as an
    // upgrade.
    const sameContextCurrent = currentByContext[plan.context];
    const isUpgrade = sameContextCurrent
      ? monthlyEq > monthlyEquivalent(sameContextCurrent)
      : monthlyEq > 0;
    const ctaLabel = labels.upgrade;

    const intervalLabel = isTeam
      ? `${labels.seat}/${plan.interval}`
      : plan.interval;

    let priceSubLabel: string | undefined;
    const localDisplayAmount = plan.price?.localDisplayAmount ?? null;
    const localCurrency = plan.price?.localCurrency ?? null;
    const hasLocal =
      localDisplayAmount !== null &&
      localCurrency !== null &&
      localCurrency.toLowerCase() !== currency.toLowerCase();

    if (hasLocal && formatPriceSubLabelLocal && displayAmount > 0) {
      const monthlyEqDisplay =
        plan.interval === "year" ? displayAmount / 12 : displayAmount;
      priceSubLabel = formatPriceSubLabelLocal({
        interval: plan.interval,
        isTeam,
        localAmount: formatCurrency(localDisplayAmount, localCurrency, locale),
        monthlyEquivalent: formatCurrency(monthlyEqDisplay, currency, locale),
        billedCurrency: currency.toUpperCase(),
      });
    } else if (plan.interval === "year" && displayAmount > 0) {
      const monthlyEqDisplay = displayAmount / 12;
      const formatted = formatCurrency(monthlyEqDisplay, currency, locale);
      priceSubLabel = isTeam
        ? `${formatted}/${labels.seat}/month — ${labels.billedYearly}`
        : `${formatted}/month — ${labels.billedYearly}`;
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

    const nameKey = `${group.context}.${group.tier}`;

    result.push({
      key: `${group.context}-${group.tier}`,
      name: planNames[nameKey] ?? `Tier ${group.tier}`,
      description: planDescriptions[nameKey] ?? "",
      highlighted: group.tier === PLAN_TIER_PRO,
      context: group.context,
      tier: group.tier,
      monthly,
      yearly,
      yearlySavingsPct,
    });
  }

  // Sort by tier order so Free (1) → Basic (2) → Pro (3).
  result.sort((a, b) => a.tier - b.tier);

  return result;
}
