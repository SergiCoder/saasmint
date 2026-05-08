"use client";

import { releaseScheduledChange } from "@/app/actions/billing";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { BillingActionButton } from "./BillingActionButton";

interface ReleaseScheduledChangeButtonProps {
  children: React.ReactNode;
  context?: SubscriptionContext;
}

export function ReleaseScheduledChangeButton({
  children,
  context,
}: ReleaseScheduledChangeButtonProps) {
  return (
    <BillingActionButton action={releaseScheduledChange} context={context}>
      {children}
    </BillingActionButton>
  );
}
