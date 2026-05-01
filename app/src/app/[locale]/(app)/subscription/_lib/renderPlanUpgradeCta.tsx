import type { Plan } from "@/domain/models/Plan";
import { PLAN_TIER_PRO } from "@/domain/models/Plan";
import type { Subscription } from "@/domain/models/Subscription";
import { BillingPortalButton } from "../_components/BillingPortalButton";
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
}

/**
 * Shared routing matrix for plan-change CTAs used on both /subscription and
 * /pricing. Same-context upgrades and downgrades route to the Stripe Billing
 * Portal (canonical change-plan surface — backend defers downgrades to period
 * end automatically). First-time purchases use Checkout. Backend rule 8
 * unconditionally 409s a second team checkout for an org owner, so the portal
 * is the only legal change-plan path there. Returns `null` when the user has
 * already scheduled a change to this exact plan — the subscription card's
 * downgrade banner offers the "Keep current plan" action instead.
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
}: RenderPlanUpgradeCtaOptions): React.ReactNode {
  if (!plan.price) return null;
  if (isCurrent) return null;

  const highlighted = plan.tier === PLAN_TIER_PRO && isUpgrade;
  const subInContext = isTeam ? teamSubscription : personalSubscription;
  const hasSubInContext = subInContext !== null;
  const canManageInContext = isTeam ? teamCanManage : personalCanManage;

  if (hasSubInContext) {
    // Non-billing members can't action a plan change; the portal would 403.
    if (!canManageInContext) return null;
    // A schedule already targets this plan — the subscription banner owns
    // the "Keep current plan" cancel-action; rendering another CTA here
    // would confuse "switch" with "undo switch".
    if (subInContext.scheduledPlan?.id === plan.id) return null;
    // Pin context; required for concurrent billers (rule 5) and harmless for
    // single-sub callers since it matches the backend default routing.
    const portalContext = isTeam ? "team" : "personal";
    return (
      <BillingPortalButton
        context={portalContext}
        highlighted={highlighted}
        fullWidth
        flow="subscription_update_confirm"
        planPriceId={plan.price.id}
      >
        {isUpgrade ? upgradeLabel : changePlanLabel}
      </BillingPortalButton>
    );
  }

  // No sub in this context yet — only upgrades (fresh checkout) make sense.
  if (!isUpgrade) return null;

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
