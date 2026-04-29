"use client";

import { useRef, useState, useTransition } from "react";
import { cancelRenewal } from "@/app/actions/billing";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "@/presentation/components/molecules/ConfirmDialog";

interface CancelRenewalButtonProps {
  label: string;
  confirmTitle: string;
  /** Already-interpolated confirmation body (the caller substitutes the period-end date). */
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

export function CancelRenewalButton({
  label,
  confirmTitle,
  confirmBody,
  confirmAction,
  confirmDismiss,
  context,
}: CancelRenewalButtonProps) {
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
      const result = await cancelRenewal(context);
      if (result.ok) {
        confirmRef.current?.close();
      } else {
        setError(translateError(result));
      }
    });
  };

  return (
    <>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={open}
        className="ml-auto cursor-pointer text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
      >
        {label}
      </button>
      <ConfirmDialog
        ref={confirmRef}
        title={confirmTitle}
        body={confirmBody}
        confirmLabel={confirmAction}
        cancelLabel={confirmDismiss}
        variant="danger"
        loading={isPending}
        onConfirm={confirm}
        onClose={() => setError(null)}
      />
    </>
  );
}
