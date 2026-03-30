import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MetricCard } from "@/presentation/components/molecules";

describe("MetricCard", () => {
  it("renders title and value", () => {
    render(<MetricCard title="Revenue" value="$12,345" />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$12,345")).toBeInTheDocument();
  });

  it("does not render change indicator when change is not provided", () => {
    const { container } = render(
      <MetricCard title="Revenue" value="$12,345" />,
    );
    // Only 2 <p> elements: title and value
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("renders positive change with green color and up arrow", () => {
    render(
      <MetricCard
        title="Revenue"
        value="$12,345"
        change={{ value: "12%", positive: true }}
      />,
    );
    const change = screen.getByText(/12%/);
    expect(change.className).toContain("text-green-600");
    expect(change.textContent).toContain("\u2191");
  });

  it("renders negative change with red color and down arrow", () => {
    render(
      <MetricCard
        title="Revenue"
        value="$12,345"
        change={{ value: "5%", positive: false }}
      />,
    );
    const change = screen.getByText(/5%/);
    expect(change.className).toContain("text-red-600");
    expect(change.textContent).toContain("\u2193");
  });

  it("applies custom className", () => {
    const { container } = render(
      <MetricCard title="Revenue" value="$12,345" className="col-span-2" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("col-span-2");
  });
});
