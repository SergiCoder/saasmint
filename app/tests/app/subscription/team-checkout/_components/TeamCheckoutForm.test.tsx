import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/billing", () => ({
  startCheckout: vi.fn(),
}));

import { TeamCheckoutForm } from "@/app/[locale]/(app)/subscription/team-checkout/_components/TeamCheckoutForm";

const defaultProps = {
  planPriceId: "price_team_1",
  planName: "Pro",
  displayAmount: 10,
  currency: "usd",
  locale: "en-US",
  interval: "month",
  labels: {
    orgName: "Organization name",
    seat: "seat",
    seats: "seats",
    total: "Total",
    checkout: "Upgrade",
    error: "Failed to start checkout. Please try again.",
  },
};

describe("TeamCheckoutForm", () => {
  it("renders the plan name and per-seat price", () => {
    render(<TeamCheckoutForm {...defaultProps} />);
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("$10/seat/month")).toBeInTheDocument();
  });

  it("renders the org name field as required", () => {
    render(<TeamCheckoutForm {...defaultProps} />);
    const input = screen.getByLabelText(/Organization name/);
    expect(input).toBeRequired();
  });

  it("defaults the seat count to minSeats (2) and shows total", () => {
    const { container } = render(<TeamCheckoutForm {...defaultProps} />);
    const quantityInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;
    expect(quantityInput.value).toBe("2");
    expect(screen.getByText("Total: $20/month")).toBeInTheDocument();
  });

  it("recomputes the total when the seat count changes", () => {
    const { container } = render(<TeamCheckoutForm {...defaultProps} />);
    const quantityInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;

    fireEvent.change(quantityInput, { target: { value: "5" } });

    expect(quantityInput.value).toBe("5");
    expect(screen.getByText("Total: $50/month")).toBeInTheDocument();
  });

  it("clamps the quantity to minSeats when a smaller value is entered", () => {
    const { container } = render(
      <TeamCheckoutForm {...defaultProps} minSeats={3} />,
    );
    const quantityInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;
    expect(quantityInput.value).toBe("3");

    fireEvent.change(quantityInput, { target: { value: "1" } });
    expect(quantityInput.value).toBe("3");
  });

  it("falls back to minSeats when the value is not a number", () => {
    const { container } = render(<TeamCheckoutForm {...defaultProps} />);
    const quantityInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;

    fireEvent.change(quantityInput, { target: { value: "" } });
    expect(quantityInput.value).toBe("2");
  });

  it("propagates the planPriceId and quantity to hidden form fields", () => {
    const { container } = render(<TeamCheckoutForm {...defaultProps} />);
    const planInput = container.querySelector(
      'input[type="hidden"][name="planPriceId"]',
    ) as HTMLInputElement;
    const qtyInput = container.querySelector(
      'input[type="hidden"][name="quantity"]',
    ) as HTMLInputElement;
    expect(planInput.value).toBe("price_team_1");
    expect(qtyInput.value).toBe("2");
  });

  it("renders the checkout button", () => {
    render(<TeamCheckoutForm {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument();
  });
});
