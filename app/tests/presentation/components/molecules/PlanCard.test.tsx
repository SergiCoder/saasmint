import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanCard } from "@/presentation/components/molecules";

const defaultProps = {
  name: "Pro",
  price: "$29",
  interval: "month",
  features: ["10 users", "Unlimited projects", "Priority support"],
  cta: <button>Subscribe</button>,
};

describe("PlanCard", () => {
  it("renders plan name, price, and interval", () => {
    render(<PlanCard {...defaultProps} />);
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("$29")).toBeInTheDocument();
    expect(screen.getByText("/month")).toBeInTheDocument();
  });

  it("renders all features", () => {
    render(<PlanCard {...defaultProps} />);
    expect(screen.getByText("10 users")).toBeInTheDocument();
    expect(screen.getByText("Unlimited projects")).toBeInTheDocument();
    expect(screen.getByText("Priority support")).toBeInTheDocument();
  });

  it("renders the cta element", () => {
    render(<PlanCard {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Subscribe" }),
    ).toBeInTheDocument();
  });

  describe("highlighted state", () => {
    it("applies highlighted border when highlighted is true", () => {
      const { container } = render(
        <PlanCard
          {...defaultProps}
          highlighted
          highlightLabel="Most Popular"
        />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("border-primary-500");
      expect(card.className).toContain("shadow-lg");
    });

    it("shows highlight label badge when highlighted with label", () => {
      render(
        <PlanCard
          {...defaultProps}
          highlighted
          highlightLabel="Most Popular"
        />,
      );
      expect(screen.getByText("Most Popular")).toBeInTheDocument();
    });

    it("does not show highlight label when not highlighted", () => {
      render(<PlanCard {...defaultProps} highlightLabel="Most Popular" />);
      expect(screen.queryByText("Most Popular")).not.toBeInTheDocument();
    });

    it("does not show highlight label when highlighted but no label provided", () => {
      render(<PlanCard {...defaultProps} highlighted />);
      // Should not render badge container - card should still be highlighted
      const { container } = render(<PlanCard {...defaultProps} highlighted />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("border-primary-500");
    });

    it("applies standard border when not highlighted", () => {
      const { container } = render(<PlanCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("border-gray-200");
      expect(card.className).toContain("shadow-sm");
    });
  });

  describe("description and features optional", () => {
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

    it("renders without features when features prop is omitted", () => {
      const { features: _features, ...withoutFeatures } = defaultProps;
      const { container } = render(<PlanCard {...withoutFeatures} />);
      // No <ul> should be present when features are omitted
      expect(container.querySelector("ul")).toBeNull();
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it("renders without features when features array is empty", () => {
      const { container } = render(
        <PlanCard {...defaultProps} features={[]} />,
      );
      expect(container.querySelector("ul")).toBeNull();
    });
  });

  it("applies custom className", () => {
    const { container } = render(
      <PlanCard {...defaultProps} className="col-span-2" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("col-span-2");
  });
});
