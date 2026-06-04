"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { updateSeats } from "@/app/actions/billing";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "@/presentation/components/molecules/ConfirmDialog";

interface SeatManagerProps {
  currentSeats: number;
  usedSeats: number;
  /**
   * Localised name of a plan-switch that's scheduled to apply at period end
   * (a previously-initiated downgrade). When both this and
   * `scheduledChangeDate` are set, the success toast appends a reminder
   * that the *plan* change is still pending — without ever implying the
   * just-submitted *seat* change was deferred (it's always immediate).
   */
  scheduledPlanName?: string | null;
  /** Pre-formatted localised date for the pending plan switch. */
  scheduledChangeDate?: string | null;
}

export function SeatManager({
  currentSeats,
  usedSeats,
  scheduledPlanName = null,
  scheduledChangeDate = null,
}: SeatManagerProps) {
  const t = useTranslations("org");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const translateError = useActionErrorMessage();
  const confirmRef = useRef<ConfirmDialogHandle>(null);
  const [seats, setSeats] = useState(currentSeats);
  const [state, formAction] = useActionState(updateSeats, null);
  const [isPending, startTransition] = useTransition();

  // The server action calls revalidatePath, which marks the layout cache
  // stale, but the client must trigger router.refresh() for Next.js to
  // re-fetch and re-render — without it, the page header keeps showing
  // the old "Members N / OLD spots" until the user reloads manually.
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  const canDecrease = seats > usedSeats;
  // No client-side upper bound — backend enforces (1–10000 per Stripe
  // pricing rules). Submitting over the cap surfaces a server error.
  const hasChanged = seats !== currentSeats;
  const isDecreasing = seats < currentSeats;

  const confirmTitle = t("removeSeatConfirmTitle");
  const confirmBody = t("removeSeatConfirmBody");
  const confirmAction = t("removeSeatConfirmAction");
  const cancelLabel = tCommon("cancel");

  const submitSeats = () => {
    const formData = new FormData();
    // Backend renamed the wire field from `quantity` to `seat_limit`
    // (v0.8.0); the action keysToSnake's the camelCase form field name.
    formData.set("seatLimit", String(seats));
    // Seats only exist on team subs; pin the context so a concurrent-billing
    // user doesn't accidentally hit the personal sub.
    formData.set("context", "team");
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
          {translateError(state)}
        </AlertBanner>
      )}
      {state?.ok && (
        <AlertBanner variant="success" className="mb-4">
          {scheduledPlanName && scheduledChangeDate
            ? t("seatsUpdatedWithPendingPlanChange", {
                plan: scheduledPlanName,
                date: scheduledChangeDate,
              })
            : t("seatsUpdated")}
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
            disabled={isPending}
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
