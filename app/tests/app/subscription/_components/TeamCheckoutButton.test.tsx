import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/billing", () => ({
  startCheckout: vi.fn(),
}));

import { TeamCheckoutButton } from "@/app/[locale]/(app)/subscription/_components/TeamCheckoutButton";

const defaultProps = {
  planPriceId: "price_team_1",
  unitPrice: 1000, // cents -> $10
  interval: "month",
  seatLabel: "seat",
  seatsLabel: "seats",
  totalLabel: "Total",
  children: "Buy team",
};

describe("TeamCheckoutButton", () => {
  it("defaults the seat count to minSeats (2) and shows the plural label", () => {
    const { container } = render(<TeamCheckoutButton {...defaultProps} />);
    const quantityInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;
    expect(quantityInput).not.toBeNull();
    expect(quantityInput.value).toBe("2");
    expect(screen.getByText("seats")).toBeInTheDocument();
    // Total: $10 * 2 = $20
    expect(screen.getByText("Total: $20/month")).toBeInTheDocument();
  });

  it("propagates the planPriceId and quantity to hidden form fields", () => {
    const { container } = render(<TeamCheckoutButton {...defaultProps} />);
    const planInput = container.querySelector(
      'input[type="hidden"][name="planPriceId"]',
    ) as HTMLInputElement;
    const qtyInput = container.querySelector(
      'input[type="hidden"][name="quantity"]',
    ) as HTMLInputElement;
    expect(planInput.value).toBe("price_team_1");
    expect(qtyInput.value).toBe("2");
  });

  it("recomputes the total when the seat count changes", () => {
    const { container } = render(<TeamCheckoutButton {...defaultProps} />);
    const quantityInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;

    fireEvent.change(quantityInput, { target: { value: "5" } });

    expect(quantityInput.value).toBe("5");
    expect(screen.getByText("Total: $50/month")).toBeInTheDocument();
  });

  it("clamps the quantity to minSeats when a smaller value is entered", () => {
    const { container } = render(
      <TeamCheckoutButton {...defaultProps} minSeats={3} />,
    );
    const quantityInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;
    expect(quantityInput.value).toBe("3");

    fireEvent.change(quantityInput, { target: { value: "1" } });
    expect(quantityInput.value).toBe("3");
  });

  it("falls back to minSeats when the value is not a number", () => {
    const { container } = render(<TeamCheckoutButton {...defaultProps} />);
    const quantityInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;

    fireEvent.change(quantityInput, { target: { value: "" } });
    expect(quantityInput.value).toBe("2");
  });

  it("uses the singular seat label when the seat count is 1", () => {
    // minSeats can be overridden to 1 to exercise the singular branch.
    const { container } = render(
      <TeamCheckoutButton {...defaultProps} minSeats={1} />,
    );
    const quantityInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;
    fireEvent.change(quantityInput, { target: { value: "1" } });
    expect(screen.getByText("seat")).toBeInTheDocument();
  });

  it("uses the primary variant when highlighted", () => {
    render(<TeamCheckoutButton {...defaultProps} highlighted />);
    const button = screen.getByRole("button", { name: "Buy team" });
    expect(button.className).toMatch(/bg-primary|primary/);
  });

  it("uses the secondary variant by default", () => {
    render(<TeamCheckoutButton {...defaultProps} />);
    const button = screen.getByRole("button", { name: "Buy team" });
    expect(button.className).not.toMatch(/bg-primary-600/);
  });
});
