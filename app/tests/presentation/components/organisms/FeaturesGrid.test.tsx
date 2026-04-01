import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FeaturesGrid } from "@/presentation/components/organisms";

const features = [
  { icon: <span>A</span>, title: "Analytics", description: "Track everything" },
  {
    icon: <span>B</span>,
    title: "Billing",
    description: "Automated invoicing",
  },
  {
    icon: <span>C</span>,
    title: "Collaboration",
    description: "Work together",
  },
];

const defaultProps = {
  label: "Features",
  title: "Everything you need",
  subtitle: "All-in-one platform",
  features,
};

describe("FeaturesGrid", () => {
  it("renders label, title, and subtitle", () => {
    render(<FeaturesGrid {...defaultProps} />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("Everything you need")).toBeInTheDocument();
    expect(screen.getByText("All-in-one platform")).toBeInTheDocument();
  });

  it("renders all feature cards", () => {
    render(<FeaturesGrid {...defaultProps} />);
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Collaboration")).toBeInTheDocument();
  });

  it("renders feature descriptions", () => {
    render(<FeaturesGrid {...defaultProps} />);
    expect(screen.getByText("Track everything")).toBeInTheDocument();
    expect(screen.getByText("Automated invoicing")).toBeInTheDocument();
  });

  it("renders with empty features array", () => {
    const { container } = render(
      <FeaturesGrid {...defaultProps} features={[]} />,
    );
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("renders as a section element", () => {
    const { container } = render(<FeaturesGrid {...defaultProps} />);
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <FeaturesGrid {...defaultProps} className="bg-gray-50" />,
    );
    const section = container.querySelector("section") as HTMLElement;
    expect(section.className).toContain("bg-gray-50");
  });
});
