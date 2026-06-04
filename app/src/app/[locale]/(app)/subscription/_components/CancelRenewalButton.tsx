"use client";

import { useRef } from "react";
import { cancelRenewal } from "@/app/actions/billing";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { useBillingAction } from "@/lib/actions/useBillingAction";
import { GHOST_UNDERLINE_BUTTON_CLASS } from "@/lib/styles";
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
  const confirmRef = useRef<ConfirmDialogHandle>(null);
  const { execute, isPending, error, clearError } = useBillingAction(
    cancelRenewal,
    () => confirmRef.current?.close(),
  );

  const open = () => {
    clearError();
    confirmRef.current?.open();
  };

  return (
    <>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={open}
        className={`ml-auto ${GHOST_UNDERLINE_BUTTON_CLASS}`}
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
        onConfirm={() => execute(context)}
        onClose={clearError}
      />
    </>
  );
}
