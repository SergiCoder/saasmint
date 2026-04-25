import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockPlanAction = vi.fn();
const mockProductAction = vi.fn();

import { CheckoutButton } from "@/app/[locale]/(app)/subscription/_components/CheckoutButton";

describe("CheckoutButton", () => {
  it("renders a hidden input with the given field name and value", () => {
    const { container } = render(
      <CheckoutButton
        action={mockPlanAction}
        field={{ name: "planPriceId", value: "price_abc" }}
      >
        Subscribe
      </CheckoutButton>,
    );
    const hidden = container.querySelector(
      'input[type="hidden"][name="planPriceId"]',
    ) as HTMLInputElement | null;
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe("price_abc");
  });

  it("routes product purchases under a different field name (regression guard)", () => {
    // The generic CheckoutButton is shared by plan and product checkout.
    // Products must post `productPriceId` so Django's plan-checkout endpoint
    // never receives a product price id and 404s ("Invalid plan price").
    const { container } = render(
      <CheckoutButton
        action={mockProductAction}
        field={{ name: "productPriceId", value: "price_credits_200" }}
      >
        Buy
      </CheckoutButton>,
    );
    const product = container.querySelector(
      'input[type="hidden"][name="productPriceId"]',
    ) as HTMLInputElement | null;
    const plan = container.querySelector(
      'input[type="hidden"][name="planPriceId"]',
    );
    expect(product?.value).toBe("price_credits_200");
    expect(plan).toBeNull();
  });

  it("renders the children inside a button", () => {
    render(
      <CheckoutButton
        action={mockPlanAction}
        field={{ name: "planPriceId", value: "price_1" }}
      >
        Get started
      </CheckoutButton>,
    );
    expect(
      screen.getByRole("button", { name: "Get started" }),
    ).toBeInTheDocument();
  });

  it("uses the secondary variant by default", () => {
    render(
      <CheckoutButton
        action={mockPlanAction}
        field={{ name: "planPriceId", value: "price_1" }}
      >
        Subscribe
      </CheckoutButton>,
    );
    const button = screen.getByRole("button", { name: "Subscribe" });
    expect(button).toHaveAttribute("data-variant", "secondary");
  });

  it("uses the primary variant when highlighted", () => {
    render(
      <CheckoutButton
        action={mockPlanAction}
        field={{ name: "planPriceId", value: "price_1" }}
        highlighted
      >
        Subscribe
      </CheckoutButton>,
    );
    const button = screen.getByRole("button", { name: "Subscribe" });
    expect(button).toHaveAttribute("data-variant", "primary");
  });
});
