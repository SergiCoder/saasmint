"use client";

import { resumeSubscription } from "@/app/actions/billing";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { BillingActionButton } from "./BillingActionButton";

interface ResumeSubscriptionButtonProps {
  children: React.ReactNode;
  /**
   * Targets one of the caller's two possible subscriptions during concurrent
   * personal+team billing. Omit for single-sub callers — the backend default
   * is correct.
   */
  context?: SubscriptionContext;
}

export function ResumeSubscriptionButton({
  children,
  context,
}: ResumeSubscriptionButtonProps) {
  return (
    <BillingActionButton action={resumeSubscription} context={context}>
      {children}
    </BillingActionButton>
  );
}
