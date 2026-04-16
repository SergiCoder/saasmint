"use client";

import { useActionState } from "react";
import { Button } from "@/presentation/components/atoms/Button";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { startCheckout } from "@/app/actions/billing";

interface CheckoutButtonProps {
  planPriceId: string;
  children: React.ReactNode;
  highlighted?: boolean;
}

export function CheckoutButton({
  planPriceId,
  children,
  highlighted = false,
}: CheckoutButtonProps) {
  const [state, action, isPending] = useActionState(startCheckout, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="planPriceId" value={planPriceId} />
      {state && !state.ok && (
        <p className="mb-2 text-sm text-red-600">{state.error}</p>
      )}
      <Button
        type="submit"
        variant={highlighted ? "primary" : "secondary"}
        className="w-full"
        loading={isPending}
      >
        {children}
      </Button>
    </form>
  );
}
