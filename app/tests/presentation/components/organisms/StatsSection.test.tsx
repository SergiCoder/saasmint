import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatsSection } from "@/presentation/components/organisms";

const stats = [
  { value: "99.9%", label: "Uptime" },
  { value: "500+", label: "Customers" },
  { value: "10M+", label: "Transactions" },
  { value: "24/7", label: "Support" },
];

describe("StatsSection", () => {
  it("renders all stat values and labels", () => {
    render(<StatsSection stats={stats} />);
    expect(screen.getByText("99.9%")).toBeInTheDocument();
    expect(screen.getByText("Uptime")).toBeInTheDocument();
    expect(screen.getByText("500+")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("10M+")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("24/7")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("renders with empty stats array", () => {
    const { container } = render(<StatsSection stats={[]} />);
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("renders as a section element", () => {
    const { container } = render(<StatsSection stats={stats} />);
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatsSection stats={stats} className="bg-gray-50" />,
    );
    const section = container.querySelector("section") as HTMLElement;
    expect(section.className).toContain("bg-gray-50");
  });
});
