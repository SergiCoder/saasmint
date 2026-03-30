import { Button } from "@/presentation/components/atoms/Button";
import { openBillingPortal } from "@/app/actions/billing";

interface BillingPortalButtonProps {
  orgId?: string;
  children: React.ReactNode;
}

export function BillingPortalButton({
  orgId,
  children,
}: BillingPortalButtonProps) {
  return (
    <form action={openBillingPortal}>
      {orgId && <input type="hidden" name="orgId" value={orgId} />}
      <Button type="submit" variant="secondary">
        {children}
      </Button>
    </form>
  );
}
