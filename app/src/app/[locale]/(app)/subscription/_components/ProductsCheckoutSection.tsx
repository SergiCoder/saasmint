"use client";

import { useState } from "react";
import { ProductsGrid } from "@/presentation/components/organisms/ProductsGrid";
import type { Product } from "@/domain/models/Product";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { CheckoutButton } from "./CheckoutButton";
import { startProductCheckout } from "@/app/actions/billing";

interface ProductsCheckoutSectionProps {
  title: string;
  products: Product[];
  productNames?: Record<number, string>;
  creditsLabel: string;
  buyLabel: string;
  locale: string;
  /**
   * Show the personal-vs-team picker. Only true for the rule-5b case (org
   * owner with concurrent personal+team subs); for everyone else the backend
   * default routing is unambiguous, so the picker is hidden and `context` is
   * not sent on the request.
   */
  showPicker: boolean;
  /** Picker label, e.g. "Buy for". */
  pickerLabel: string;
  personalOptionLabel: string;
  teamOptionLabel: string;
}

export function ProductsCheckoutSection({
  title,
  products,
  productNames,
  creditsLabel,
  buyLabel,
  locale,
  showPicker,
  pickerLabel,
  personalOptionLabel,
  teamOptionLabel,
}: ProductsCheckoutSectionProps) {
  // Default to "team" so the client-side picker matches the backend default
  // for org members. The picker only renders when `showPicker` is true; for
  // everyone else the unused state value is irrelevant because we don't
  // forward `context` to the action.
  const [selected, setSelected] = useState<SubscriptionContext>("team");

  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      {showPicker && (
        <fieldset className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {/* Keep `legend` in the DOM for screen readers (it's the
            accessible name for the radio group), but visually render the
            label as a card heading so the picker matches the product
            cards sitting next to it instead of looking like a stray form
            field. */}
          <legend className="sr-only">{pickerLabel}</legend>
          <h3 aria-hidden="true" className="font-semibold text-gray-900">
            {pickerLabel}
          </h3>
          <div className="mt-3 flex flex-wrap gap-4">
            {(
              [
                ["personal", personalOptionLabel],
                ["team", teamOptionLabel],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
              >
                <input
                  type="radio"
                  name="product-checkout-context"
                  value={value}
                  checked={selected === value}
                  onChange={() => setSelected(value)}
                  className="h-4 w-4 cursor-pointer"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <ProductsGrid
        title={title}
        products={products}
        productNames={productNames}
        creditsLabel={creditsLabel}
        locale={locale}
        renderCta={(product) =>
          product.price && (
            <CheckoutButton
              action={startProductCheckout}
              field={{ name: "productPriceId", value: product.price.id }}
              {...(showPicker ? { context: selected } : {})}
            >
              {buyLabel}
            </CheckoutButton>
          )
        }
      />
    </div>
  );
}
