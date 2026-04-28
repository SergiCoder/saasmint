"use client";

import { useActionState, useState } from "react";
import { Button } from "@/presentation/components/atoms/Button";
import { Input } from "@/presentation/components/atoms/Input";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { startCheckout } from "@/app/actions/billing";
import { MAX_SEATS } from "@/domain/models/Subscription";
import { formatCurrency } from "@/lib/formatCurrency";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface TeamCheckoutFormProps {
  planPriceId: string;
  planName: string;
  displayAmount: number;
  currency: string;
  locale: string;
  interval: string;
  minSeats?: number;
  /**
   * Translated notice shown when the user has an active personal subscription.
   * When set, the form also renders an opt-out checkbox to keep personal
   * running concurrently. Undefined hides both.
   */
  personalSubAutoCancelNotice?: string;
  labels: {
    orgName: string;
    seat: string;
    seats: string;
    total: string;
    checkout: string;
    error: string;
    keepPersonalSubscription: string;
  };
}

export function TeamCheckoutForm({
  planPriceId,
  planName,
  displayAmount,
  currency,
  locale,
  interval,
  minSeats = 2,
  personalSubAutoCancelNotice,
  labels,
}: TeamCheckoutFormProps) {
  const translateError = useActionErrorMessage();
  const [quantity, setQuantity] = useState(minSeats);
  const [state, action, isPending] = useActionState(startCheckout, undefined);
  const total = displayAmount * quantity;
  const formattedTotal = formatCurrency(total, currency, locale);
  const formattedPerSeat = formatCurrency(displayAmount, currency, locale);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="planPriceId" value={planPriceId} />
      <input type="hidden" name="quantity" value={quantity} />

      <div>
        <h2 className="text-lg font-semibold text-gray-900">{planName}</h2>
        <p className="text-sm text-gray-500">
          {formattedPerSeat}/{labels.seat}/{interval}
        </p>
      </div>

      {state && !state.ok && (
        <AlertBanner variant="error">
          {translateError(state) || labels.error}
        </AlertBanner>
      )}

      {personalSubAutoCancelNotice && (
        <div className="space-y-3">
          <AlertBanner variant="info">
            {personalSubAutoCancelNotice}
          </AlertBanner>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="keepPersonalSubscription"
              className="mt-0.5 cursor-pointer"
            />
            <span>{labels.keepPersonalSubscription}</span>
          </label>
        </div>
      )}

      <FormField label={labels.orgName} name="orgName" required />

      <div className="space-y-1">
        <label htmlFor="seats" className="text-sm font-medium text-gray-700">
          {labels.seats}
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="seats"
            type="number"
            min={minSeats}
            max={MAX_SEATS}
            value={quantity}
            onChange={(e) =>
              setQuantity(
                Math.max(minSeats, parseInt(e.target.value, 10) || minSeats),
              )
            }
            className="w-20 text-center"
          />
          <span className="text-sm text-gray-500">
            {quantity === 1 ? labels.seat : labels.seats}
          </span>
        </div>
      </div>

      <p className="text-lg font-semibold text-gray-900">
        {labels.total}: {formattedTotal}/{interval}
      </p>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        loading={isPending}
      >
        {labels.checkout}
      </Button>
    </form>
  );
}
