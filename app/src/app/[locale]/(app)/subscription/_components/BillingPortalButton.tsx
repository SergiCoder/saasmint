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
}

/**
 * Opens the vanilla Stripe Billing Portal for payment method, invoices, and
 * cancel. Plan switches no longer go through the portal — see
 * `ChangePlanButton` for upgrade/downgrade flows.
 */
export function BillingPortalButton({
  children,
  context,
}: BillingPortalButtonProps) {
  return (
    <form action={openBillingPortal}>
      {context ? <input type="hidden" name="context" value={context} /> : null}
      <Button type="submit" variant="secondary">
        {children}
      </Button>
    </form>
  );
}
