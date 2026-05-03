"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { changePlan } from "@/app/actions/billing";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import { Button } from "@/presentation/components/atoms/Button";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "@/presentation/components/molecules/ConfirmDialog";

interface ChangePlanButtonProps {
  children: React.ReactNode;
  planPriceId: string;
  /** True when target price < current price — backend defers to period end. */
  isDeferred: boolean;
  highlighted?: boolean;
  fullWidth?: boolean;
  confirmTitle: string;
  /** Already-interpolated body (caller substitutes plan name, price, period-end date). */
  confirmBody: string;
  confirmAction: string;
  confirmDismiss: string;
  /**
   * Targets one of the caller's two possible subscriptions during concurrent
   * personal+team billing. Omit for single-sub callers — the backend default
   * (`team` for org members, `personal` otherwise) is correct.
   */
  context?: SubscriptionContext;
}

export function ChangePlanButton({
  children,
  planPriceId,
  isDeferred,
  highlighted = false,
  fullWidth = false,
  confirmTitle,
  confirmBody,
  confirmAction,
  confirmDismiss,
  context,
}: ChangePlanButtonProps) {
  const router = useRouter();
  const translateError = useActionErrorMessage();
  const confirmRef = useRef<ConfirmDialogHandle>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setError(null);
    confirmRef.current?.open();
  };

  const confirm = () => {
    startTransition(async () => {
      const result = await changePlan(planPriceId, context);
      if (result.ok) {
        confirmRef.current?.close();
        // Action calls revalidatePath, but a Server Component re-render only
        // happens once the client triggers it — without router.refresh the
        // user sees stale plan data until they reload manually.
        router.refresh();
      } else {
        setError(translateError(result));
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant={highlighted ? "primary" : "secondary"}
        className={fullWidth ? "w-full" : ""}
        onClick={open}
      >
        {children}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <ConfirmDialog
        ref={confirmRef}
        title={confirmTitle}
        body={confirmBody}
        confirmLabel={confirmAction}
        cancelLabel={confirmDismiss}
        variant="primary"
        loading={isPending}
        onConfirm={confirm}
        onClose={() => setError(null)}
      />
    </>
  );
}
