"use client";

import { useActionState } from "react";
import { Button } from "@/presentation/components/atoms/Button";
import type { ActionResult } from "@/lib/actions/ActionResult";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

export type CheckoutAction = (
  prevState: ActionResult | undefined,
  formData: FormData,
) => Promise<ActionResult>;

interface CheckoutButtonProps {
  /** Server action to invoke — plan checkout, product checkout, etc. */
  action: CheckoutAction;
  /**
   * Hidden form field forwarded to the action. Distinct `name` per action
   * (`planPriceId` for subscription checkout, `productPriceId` for one-time
   * product purchase) so a product purchase can't silently route through
   * the plan-checkout endpoint.
   */
  field: { name: string; value: string };
  /**
   * Optional `?context=` value forwarded as a hidden form field. Only set in
   * the rule-5b case (org owner with concurrent personal+team subs) — when
   * omitted the backend falls back to its account-type default.
   */
  context?: "personal" | "team";
  children: React.ReactNode;
  highlighted?: boolean;
}

export function CheckoutButton({
  action,
  field,
  context,
  children,
  highlighted = false,
}: CheckoutButtonProps) {
  const translateError = useActionErrorMessage();
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction}>
      <input type="hidden" name={field.name} value={field.value} />
      {context && <input type="hidden" name="context" value={context} />}
      {state && !state.ok && (
        <p className="mb-2 text-sm text-red-600">{translateError(state)}</p>
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
