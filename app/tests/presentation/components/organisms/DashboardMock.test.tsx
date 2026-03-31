import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DashboardMock } from "@/presentation/components/organisms";

const defaultProps = {
  url: "app.example.com/dashboard",
  metrics: [
    { title: "Revenue", value: "$12K", change: "+8%" },
    { title: "Users", value: "1,234" },
  ],
  chartLabel: "Monthly Revenue",
  chartBars: [20, 45, 30, 60, 80, 55, 90],
  activities: [
    { icon: <span>$</span>, text: "New payment received", time: "2m ago" },
    { icon: <span>U</span>, text: "User signed up", time: "5m ago" },
  ],
};

describe("DashboardMock", () => {
  it("renders the browser bar with the URL", () => {
    render(<DashboardMock {...defaultProps} />);
    expect(screen.getByText("app.example.com/dashboard")).toBeInTheDocument();
  });

  it("renders all metric cards", () => {
    render(<DashboardMock {...defaultProps} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$12K")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders the chart label", () => {
    render(<DashboardMock {...defaultProps} />);
    expect(screen.getByText("Monthly Revenue")).toBeInTheDocument();
  });

  it("renders chart bars matching the count", () => {
    const { container } = render(<DashboardMock {...defaultProps} />);
    // Chart bars are direct children of the flex container with 48px height
    const barContainer = container.querySelector("[style*='height: 48px']");
    expect(barContainer).toBeInTheDocument();
    expect(barContainer!.children).toHaveLength(7);
  });

  it("renders activity feed items", () => {
    render(<DashboardMock {...defaultProps} />);
    expect(screen.getByText("New payment received")).toBeInTheDocument();
    expect(screen.getByText("2m ago")).toBeInTheDocument();
    expect(screen.getByText("User signed up")).toBeInTheDocument();
    expect(screen.getByText("5m ago")).toBeInTheDocument();
  });

  it("renders metric without change when change is not provided", () => {
    render(<DashboardMock {...defaultProps} />);
    // "Users" metric has no change prop — just verify it renders without error
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <DashboardMock {...defaultProps} className="max-w-lg" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("max-w-lg");
  });
});
