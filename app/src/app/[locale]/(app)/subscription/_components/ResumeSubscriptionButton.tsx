"use client";

import { useState, useTransition } from "react";
import { Button } from "@/presentation/components/atoms/Button";
import { resumeSubscription } from "@/app/actions/billing";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

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
  const translateError = useActionErrorMessage();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await resumeSubscription(context);
      if (!result.ok) {
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
