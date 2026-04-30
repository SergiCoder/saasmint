"use client";

import { useState } from "react";
import { ProductsGrid } from "@/presentation/components/organisms/ProductsGrid";
import type { Product } from "@/domain/models/Product";
import { CheckoutButton } from "./CheckoutButton";
import { startProductCheckout } from "@/app/actions/billing";

type CheckoutContext = "personal" | "team";

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
  const [selected, setSelected] = useState<CheckoutContext>("team");

  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      {showPicker && (
        <fieldset className="rounded-lg border border-gray-200 bg-white p-4">
          <legend className="px-1 text-sm font-medium text-gray-700">
            {pickerLabel}
          </legend>
          <div className="mt-1 flex flex-wrap gap-4">
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
