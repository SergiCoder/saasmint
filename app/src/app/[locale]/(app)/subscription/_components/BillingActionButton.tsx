"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/presentation/components/atoms/Button";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import type { ActionResult } from "@/lib/actions/ActionResult";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface BillingActionButtonProps {
  children: React.ReactNode;
  /**
   * Server action invoked on click. Receives the optional context so a single
   * helper covers personal vs. team-targeted mutations during concurrent
   * billing (rule 5).
   */
  action: (context?: SubscriptionContext) => Promise<ActionResult>;
  /**
   * Targets one of the caller's two possible subscriptions during concurrent
   * personal+team billing. Omit for single-sub callers — the backend default
   * is correct.
   */
  context?: SubscriptionContext;
}

/**
 * Shared "fire a context-aware billing action and refresh" button. Used by
 * Resume and Release flows; both render the same compose-and-refresh shape
 * so the component lives here instead of in each sibling file.
 */
export function BillingActionButton({
  children,
  action,
  context,
}: BillingActionButtonProps) {
  const router = useRouter();
  const translateError = useActionErrorMessage();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await action(context);
      if (result.ok) {
        router.refresh();
      } else {
        setError(translateError(result));
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="primary"
        onClick={handleClick}
        loading={isPending}
      >
        {children}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
