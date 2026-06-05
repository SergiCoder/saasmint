import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanCard } from "@/presentation/components/molecules";

const defaultProps = {
  name: "Pro",
  price: "$29",
  interval: "month",
  cta: <button>Subscribe</button>,
};

describe("PlanCard", () => {
  it("renders plan name, price, and interval", () => {
    render(<PlanCard {...defaultProps} />);
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("$29")).toBeInTheDocument();
    expect(screen.getByText("/month")).toBeInTheDocument();
  });

  it("renders the cta element", () => {
    render(<PlanCard {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Subscribe" }),
    ).toBeInTheDocument();
  });

  describe("highlighted state", () => {
    it("applies highlighted border when highlighted is true", () => {
      const { container } = render(<PlanCard {...defaultProps} highlighted />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("border-primary-500");
      expect(card.className).toContain("shadow-lg");
    });

    it("applies standard border when not highlighted", () => {
      const { container } = render(<PlanCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("border-gray-200");
      expect(card.className).toContain("shadow-sm");
    });
  });

  describe("description optional", () => {
    it("renders description when provided", () => {
      render(<PlanCard {...defaultProps} description="Best for small teams" />);
      expect(screen.getByText("Best for small teams")).toBeInTheDocument();
    });

    it("does not render a description paragraph when omitted", () => {
      render(<PlanCard {...defaultProps} />);
      expect(
        screen.queryByText("Best for small teams"),
      ).not.toBeInTheDocument();
    });
  });

  it("applies custom className", () => {
    const { container } = render(
      <PlanCard {...defaultProps} className="col-span-2" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("col-span-2");
  });

  describe("priceSubLabel", () => {
    it("renders the dual-currency disclosure when provided", () => {
      render(
        <PlanCard
          {...defaultProps}
          priceSubLabel="≈ CHF 17.42 — billed in USD"
        />,
      );
      expect(
        screen.getByText("≈ CHF 17.42 — billed in USD"),
      ).toBeInTheDocument();
    });

    it("does not render a sub-label paragraph when omitted", () => {
      const { container } = render(<PlanCard {...defaultProps} />);
      expect(container.querySelectorAll("p")).toHaveLength(1);
    });
  });
});
