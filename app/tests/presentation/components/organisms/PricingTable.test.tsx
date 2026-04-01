import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PricingTable } from "@/presentation/components/organisms";

const plans = [
  {
    name: "Free",
    price: "$0",
    interval: "month",
    features: ["1 user", "Basic support"],
    cta: <button>Get Started</button>,
  },
  {
    name: "Pro",
    price: "$29",
    interval: "month",
    features: ["10 users", "Priority support"],
    cta: <button>Subscribe</button>,
    highlighted: true,
    highlightLabel: "Most Popular",
  },
];

describe("PricingTable", () => {
  it("renders all plan cards", () => {
    render(<PricingTable plans={plans} />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("renders CTAs for each plan", () => {
    render(<PricingTable plans={plans} />);
    expect(
      screen.getByRole("button", { name: "Get Started" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Subscribe" }),
    ).toBeInTheDocument();
  });

  it("renders with empty plans array", () => {
    const { container } = render(<PricingTable plans={[]} />);
    // Grid container should still exist, just empty
    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <PricingTable plans={plans} className="max-w-5xl" />,
    );
    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("max-w-5xl");
  });
});
