import { Button } from "@/presentation/components/atoms/Button";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { openBillingPortal } from "@/app/actions/billing";

interface BillingPortalButtonProps {
  children: React.ReactNode;
  /**
   * Targets one of the caller's two possible Stripe customers during
   * concurrent personal+team billing. Omit for single-sub callers — the
   * backend default (`team` for org members, `personal` otherwise) is
   * correct. MUST be set on either side when both subs are active so a
   * "manage personal" click doesn't silently land in the team portal.
   */
  context?: SubscriptionContext;
  /**
   * Renders the same prominent / muted CTA pair the checkout buttons use,
   * so an upgrade-via-portal button reads visually identical to a
   * fresh-checkout CTA in the plan grid. Default `false` keeps the muted
   * "Manage" look used inside `CurrentSubscriptionCard`.
   */
  highlighted?: boolean;
  /**
   * Stretch the button to fill its parent. Default `false` keeps the
   * inline-sized "Manage" look. Plan-grid CTA callers pass `true` so the
   * button matches the full-width checkout CTAs sitting next to it.
   */
  fullWidth?: boolean;
}

export function BillingPortalButton({
  children,
  context,
  highlighted = false,
  fullWidth = false,
}: BillingPortalButtonProps) {
  return (
    <form action={openBillingPortal}>
      {context ? <input type="hidden" name="context" value={context} /> : null}
      <Button
        type="submit"
        variant={highlighted ? "primary" : "secondary"}
        className={fullWidth ? "w-full" : ""}
      >
        {children}
      </Button>
    </form>
  );
}
