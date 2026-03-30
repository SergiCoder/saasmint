"use client";

import { Button } from "@/presentation/components/atoms/Button";
import { startCheckout } from "@/app/actions/billing";

interface CheckoutButtonProps {
  planPriceId: string;
  orgId?: string;
  children: React.ReactNode;
  highlighted?: boolean;
}

export function CheckoutButton({
  planPriceId,
  orgId,
  children,
  highlighted = false,
}: CheckoutButtonProps) {
  return (
    <form action={startCheckout}>
      <input type="hidden" name="planPriceId" value={planPriceId} />
      {orgId && <input type="hidden" name="orgId" value={orgId} />}
      <Button
        type="submit"
        variant={highlighted ? "primary" : "secondary"}
        className="w-full"
      >
        {children}
      </Button>
    </form>
  );
}
