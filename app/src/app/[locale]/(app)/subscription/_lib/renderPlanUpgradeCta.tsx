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
  isTeam: boolean;
  ctaLabel: string;
  hasOrg: boolean;
  personalSubscription: Subscription | null;
  teamSubscription: Subscription | null;
  personalCanManage: boolean;
  teamCanManage: boolean;
}

/**
 * Shared routing matrix for plan upgrade CTAs used on both /subscription and
 * /pricing. Upgrades for an existing in-context subscription route to the
 * Stripe Billing Portal (canonical change-plan surface). First-time purchases
 * use Checkout. Backend rule 8 unconditionally 409s a second team checkout for
 * an org owner, so the portal is the only legal upgrade path there.
 */
export function renderPlanUpgradeCta({
  plan,
  isUpgrade,
  isTeam,
  ctaLabel,
  hasOrg,
  personalSubscription,
  teamSubscription,
  personalCanManage,
  teamCanManage,
}: RenderPlanUpgradeCtaOptions): React.ReactNode {
  if (!plan.price) return null;
  if (!isUpgrade) return null;

  const highlighted = plan.tier === PLAN_TIER_PRO;
  const hasSubInContext = isTeam
    ? teamSubscription !== null
    : personalSubscription !== null;
  const canManageInContext = isTeam ? teamCanManage : personalCanManage;

  if (hasSubInContext) {
    // Non-billing members can't action the upgrade; the portal would 403.
    if (!canManageInContext) return null;
    // Pin context; required for concurrent billers (rule 5) and harmless for
    // single-sub callers since it matches the backend default routing.
    const portalContext = isTeam ? "team" : "personal";
    return (
      <BillingPortalButton
        context={portalContext}
        highlighted={highlighted}
        fullWidth
      >
        {ctaLabel}
      </BillingPortalButton>
    );
  }

  if (isTeam) {
    // First-time team checkout: rule 8 blocks a second team checkout for an
    // org owner who doesn't yet have a team sub.
    if (hasOrg) return null;
    return (
      <TeamCheckoutButton planPriceId={plan.price.id} highlighted={highlighted}>
        {ctaLabel}
      </TeamCheckoutButton>
    );
  }

  return (
    <CheckoutButton
      action={startCheckout}
      field={{ name: "planPriceId", value: plan.price.id }}
      highlighted={highlighted}
    >
      {ctaLabel}
    </CheckoutButton>
  );
}
