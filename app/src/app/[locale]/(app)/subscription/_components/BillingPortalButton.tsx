import { Button } from "@/presentation/components/atoms/Button";
import { openBillingPortal } from "@/app/actions/billing";

interface BillingPortalButtonProps {
  children: React.ReactNode;
}

export function BillingPortalButton({ children }: BillingPortalButtonProps) {
  return (
    <form action={openBillingPortal}>
      <Button type="submit" variant="secondary">
        {children}
      </Button>
    </form>
  );
}
