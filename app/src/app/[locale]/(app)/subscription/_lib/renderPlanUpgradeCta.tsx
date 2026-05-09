import type { Plan } from "@/domain/models/Plan";
import { PLAN_TIER_PRO } from "@/domain/models/Plan";
import type { Subscription } from "@/domain/models/Subscription";
import { translatePlanName } from "@/lib/i18n/planTranslation";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatLongDate } from "@/lib/formatLongDate";
import { ChangePlanButton } from "../_components/ChangePlanButton";
import { CheckoutButton } from "../_components/CheckoutButton";
import { TeamCheckoutButton } from "../_components/TeamCheckoutButton";
import { startCheckout } from "@/app/actions/billing";

interface RenderPlanUpgradeCtaOptions {
  plan: Plan;
  isUpgrade: boolean;
  isCurrent: boolean;
  isTeam: boolean;
  upgradeLabel: string;
  changePlanLabel: string;
  hasOrg: boolean;
  personalSubscription: Subscription | null;
  teamSubscription: Subscription | null;
  personalCanManage: boolean;
  teamCanManage: boolean;
  locale: string;
  /**
   * `getTranslations("billing")` from next-intl. Narrowed to the literal
   * union of keys this helper actually reads — a function accepting the
   * full `billing.*` union (what next-intl returns) is assignable here via
   * parameter contravariance.
   */
  tBilling: (
    key:
      | "scheduledPlanLabel"
      | "changePlanConfirmTitleImmediate"
      | "changePlanConfirmTitleDeferred"
      | "changePlanConfirmBodyImmediate"
      | "changePlanConfirmBodyDeferred"
      | "changePlanConfirmAction"
      | "changePlanConfirmDismiss",
    values?: Record<string, string | number>,
  ) => string;
  /** `useTranslations("plans")` — for the target plan's localised name. */
  tPlans: (key: never) => string;
  /**
   * Render the CTA button at full width (default `true`, matches the plan
   * grid layout). Set `false` for inline / banner usage where the button
   * should hug its label width.
   */
  fullWidth?: boolean;
}

type Price = NonNullable<Plan["price"]>;

function isPricedPlan(plan: Plan): plan is Plan & { price: Price } {
  return plan.price !== null;
}

interface ChangePlanCtaArgs {
  plan: Plan & { price: Price };
  subInContext: Subscription;
  isUpgrade: boolean;
  isTeam: boolean;
  highlighted: boolean;
  canManageInContext: boolean;
  upgradeLabel: string;
  changePlanLabel: string;
  locale: string;
  tBilling: RenderPlanUpgradeCtaOptions["tBilling"];
  tPlans: RenderPlanUpgradeCtaOptions["tPlans"];
  fullWidth: boolean;
}

function renderChangePlanCta({
  plan,
  subInContext,
  isUpgrade,
  isTeam,
  highlighted,
  canManageInContext,
  upgradeLabel,
  changePlanLabel,
  locale,
  tBilling,
  tPlans,
  fullWidth,
}: ChangePlanCtaArgs): React.ReactNode {
  // A schedule already targets this plan — render a non-actionable
  // "Scheduled — {date}" label so the user can see at a glance which
  // plan they're switching to. The undo control lives on the current
  // plan card's banner ("Keep {currentPlan}"); rendering another CTA
  // here would confuse "switch" with "undo switch". This branch fires
  // regardless of canManage so non-billing members still see the
  // pending change on the right card.
  if (subInContext.scheduledPlan?.id === plan.id) {
    const cutoverIso = subInContext.scheduledChangeAt;
    const cutover = cutoverIso ? new Date(cutoverIso) : null;
    const cutoverDisplay = cutover ? formatLongDate(cutover, locale) : "";
    return (
      <p className="text-primary-700 text-center text-sm font-medium">
        {tBilling("scheduledPlanLabel", { date: cutoverDisplay })}
      </p>
    );
  }
  // Non-billing members can't action a plan change; the action would 403.
  if (!canManageInContext) return null;
  // Pin context; required for concurrent billers (rule 5) and harmless for
  // single-sub callers since it matches the backend default routing.
  const portalContext = isTeam ? "team" : "personal";
  // Detect deferred (downgrade) by comparing target price to current price.
  // Backend uses the same comparison: `target.amount < current.amount` →
  // SubscriptionSchedule, else immediate proration.
  const currentAmount = subInContext.plan.price?.amount ?? 0;
  const isDeferred = plan.price.amount < currentAmount;

  const targetPlanName = translatePlanName(tPlans, plan);
  const targetPriceFormatted = formatCurrency(
    plan.price.displayAmount,
    plan.price.currency,
    locale,
  );
  const periodEndDate = new Date(subInContext.currentPeriodEnd);
  const periodEndDisplay = formatLongDate(periodEndDate, locale);

  const confirmTitle = isDeferred
    ? tBilling("changePlanConfirmTitleDeferred", { plan: targetPlanName })
    : tBilling("changePlanConfirmTitleImmediate", { plan: targetPlanName });
  const confirmBody = isDeferred
    ? tBilling("changePlanConfirmBodyDeferred", {
        plan: targetPlanName,
        price: targetPriceFormatted,
        date: periodEndDisplay,
      })
    : tBilling("changePlanConfirmBodyImmediate", {
        plan: targetPlanName,
        price: targetPriceFormatted,
      });

  return (
    <ChangePlanButton
      planPriceId={plan.price.id}
      isDeferred={isDeferred}
      context={portalContext}
      highlighted={highlighted}
      fullWidth={fullWidth}
      confirmTitle={confirmTitle}
      confirmBody={confirmBody}
      confirmAction={tBilling("changePlanConfirmAction")}
      confirmDismiss={tBilling("changePlanConfirmDismiss")}
    >
      {isUpgrade ? upgradeLabel : changePlanLabel}
    </ChangePlanButton>
  );
}

function renderFirstCheckoutCta(args: {
  plan: Plan & { price: Price };
  isTeam: boolean;
  hasOrg: boolean;
  highlighted: boolean;
  upgradeLabel: string;
}): React.ReactNode {
  const { plan, isTeam, hasOrg, highlighted, upgradeLabel } = args;
  if (isTeam) {
    // First-time team checkout: rule 8 blocks a second team checkout for an
    // org owner who doesn't yet have a team sub.
    if (hasOrg) return null;
    return (
      <TeamCheckoutButton planPriceId={plan.price.id} highlighted={highlighted}>
        {upgradeLabel}
      </TeamCheckoutButton>
    );
  }
  return (
    <CheckoutButton
      action={startCheckout}
      field={{ name: "planPriceId", value: plan.price.id }}
      highlighted={highlighted}
    >
      {upgradeLabel}
    </CheckoutButton>
  );
}

/**
 * Shared routing matrix for plan-change CTAs used on both /subscription and
 * /pricing. Same-context upgrades and downgrades route to an in-app confirm
 * dialog that calls `PATCH /subscriptions/me/`. Backend applies upgrades
 * immediately and defers downgrades to period end. First-time purchases use
 * Checkout. Backend rule 8 unconditionally 409s a second team checkout for
 * an org owner, so the in-app PATCH is the only legal change-plan path
 * there. Returns `null` when the user has already scheduled a change to
 * this exact plan — the subscription card's downgrade banner offers the
 * "Keep current plan" action instead.
 */
export function renderPlanUpgradeCta({
  plan,
  isUpgrade,
  isCurrent,
  isTeam,
  upgradeLabel,
  changePlanLabel,
  hasOrg,
  personalSubscription,
  teamSubscription,
  personalCanManage,
  teamCanManage,
  locale,
  tBilling,
  tPlans,
  fullWidth = true,
}: RenderPlanUpgradeCtaOptions): React.ReactNode {
  if (!isPricedPlan(plan)) return null;
  if (isCurrent) return null;

  const pricedPlan = plan;
  const highlighted = plan.tier === PLAN_TIER_PRO && isUpgrade;
  const subInContext = isTeam ? teamSubscription : personalSubscription;
  const canManageInContext = isTeam ? teamCanManage : personalCanManage;

  if (subInContext !== null) {
    return renderChangePlanCta({
      plan: pricedPlan,
      subInContext,
      isUpgrade,
      isTeam,
      highlighted,
      canManageInContext,
      upgradeLabel,
      changePlanLabel,
      locale,
      tBilling,
      tPlans,
      fullWidth,
    });
  }

  // No sub in this context yet — only upgrades (fresh checkout) make sense.
  if (!isUpgrade) return null;
  return renderFirstCheckoutCta({
    plan: pricedPlan,
    isTeam,
    hasOrg,
    highlighted,
    upgradeLabel,
  });
}
