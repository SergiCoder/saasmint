"use client";

import { useState } from "react";
import { Button } from "@/presentation/components/atoms/Button";
import { Input } from "@/presentation/components/atoms/Input";
import { startCheckout } from "@/app/actions/billing";

interface TeamCheckoutButtonProps {
  planPriceId: string;
  unitPrice: number;
  interval: string;
  minSeats?: number;
  children: React.ReactNode;
  highlighted?: boolean;
  seatLabel: string;
  seatsLabel: string;
  totalLabel: string;
}

export function TeamCheckoutButton({
  planPriceId,
  unitPrice,
  interval,
  minSeats = 2,
  children,
  highlighted = false,
  seatLabel,
  seatsLabel,
  totalLabel,
}: TeamCheckoutButtonProps) {
  const [quantity, setQuantity] = useState(minSeats);
  const total = (unitPrice * quantity) / 100;

  return (
    <form action={startCheckout} className="space-y-3">
      <input type="hidden" name="planPriceId" value={planPriceId} />
      <input type="hidden" name="quantity" value={quantity} />
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={minSeats}
          max={100}
          value={quantity}
          onChange={(e) =>
            setQuantity(
              Math.max(minSeats, parseInt(e.target.value, 10) || minSeats),
            )
          }
          className="w-20 text-center"
        />
        <span className="text-sm text-gray-500">
          {quantity === 1 ? seatLabel : seatsLabel}
        </span>
      </div>
      <p className="pb-3 text-base font-medium text-gray-900">
        {totalLabel}: ${total}/{interval}
      </p>
      <Button
        type="submit"
        variant={highlighted ? "primary" : "secondary"}
        className="w-full"
      >
        {children}
      </Button>
    </form>
  );
}
