"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateSeats } from "@/app/actions/billing";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "@/presentation/components/molecules/ConfirmDialog";
import { MAX_SEATS } from "@/domain/models/Subscription";

interface SeatManagerProps {
  currentSeats: number;
  usedSeats: number;
}

export function SeatManager({ currentSeats, usedSeats }: SeatManagerProps) {
  const t = useTranslations("org");
  const tCommon = useTranslations("common");
  const confirmRef = useRef<ConfirmDialogHandle>(null);
  const [seats, setSeats] = useState(currentSeats);
  const [state, formAction] = useActionState(updateSeats, null);
  const [isPending, startTransition] = useTransition();

  const canDecrease = seats > usedSeats;
  const canIncrease = seats < MAX_SEATS;
  const hasChanged = seats !== currentSeats;
  const isDecreasing = seats < currentSeats;

  const confirmTitle = t("removeSeatConfirmTitle");
  const confirmBody = t("removeSeatConfirmBody");
  const confirmAction = t("removeSeatConfirmAction");
  const cancelLabel = tCommon("cancel");

  const submitSeats = () => {
    const formData = new FormData();
    formData.set("quantity", String(seats));
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleSubmit = () => {
    if (isDecreasing) {
      confirmRef.current?.open();
    } else {
      submitSeats();
    }
  };

  const confirmDecrease = () => {
    confirmRef.current?.close();
    submitSeats();
  };

  return (
    <>
      {state && !state.ok && (
        <AlertBanner variant="error" className="mb-4">
          {state.error}
        </AlertBanner>
      )}
      {state?.ok && (
        <AlertBanner variant="success" className="mb-4">
          {t("seatsUpdated")}
        </AlertBanner>
      )}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSeats((s) => s - 1)}
            disabled={!canDecrease || isPending}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("removeSeat")}
          >
            −
          </button>
          <span className="min-w-[3ch] text-center text-sm font-medium text-gray-900">
            {seats}
          </span>
          <button
            type="button"
            onClick={() => setSeats((s) => s + 1)}
            disabled={!canIncrease || isPending}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("addSeat")}
          >
            +
          </button>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          loading={isPending}
          disabled={!hasChanged}
        >
          {t("updateSeats")}
        </Button>
      </div>

      <ConfirmDialog
        ref={confirmRef}
        title={confirmTitle}
        body={confirmBody}
        confirmLabel={confirmAction}
        cancelLabel={cancelLabel}
        variant="danger"
        loading={isPending}
        onConfirm={confirmDecrease}
      />
    </>
  );
}
