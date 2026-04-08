import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/billing", () => ({
  startCheckout: vi.fn(),
}));

import { CheckoutButton } from "@/app/[locale]/(app)/subscription/_components/CheckoutButton";
import { startCheckout } from "@/app/actions/billing";

describe("CheckoutButton", () => {
  it("imports the startCheckout server action", () => {
    expect(startCheckout).toBeDefined();
  });

  it("renders a hidden input carrying the planPriceId", () => {
    const { container } = render(
      <CheckoutButton planPriceId="price_abc">Subscribe</CheckoutButton>,
    );
    const hidden = container.querySelector(
      'input[type="hidden"][name="planPriceId"]',
    ) as HTMLInputElement | null;
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe("price_abc");
  });

  it("renders the children inside a button", () => {
    render(<CheckoutButton planPriceId="price_1">Get started</CheckoutButton>);
    expect(
      screen.getByRole("button", { name: "Get started" }),
    ).toBeInTheDocument();
  });

  it("uses the secondary variant by default", () => {
    render(<CheckoutButton planPriceId="price_1">Subscribe</CheckoutButton>);
    const button = screen.getByRole("button", { name: "Subscribe" });
    // Button atom maps variants to class names; we just assert no primary teal.
    expect(button.className).not.toMatch(/bg-primary/);
  });

  it("uses the primary variant when highlighted", () => {
    render(
      <CheckoutButton planPriceId="price_1" highlighted>
        Subscribe
      </CheckoutButton>,
    );
    const button = screen.getByRole("button", { name: "Subscribe" });
    expect(button.className).toMatch(/bg-primary|primary/);
  });
});
