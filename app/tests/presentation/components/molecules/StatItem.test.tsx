import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatItem } from "@/presentation/components/molecules";

describe("StatItem", () => {
  it("renders value and label", () => {
    render(<StatItem value="99.9%" label="Uptime" />);
    expect(screen.getByText("99.9%")).toBeInTheDocument();
    expect(screen.getByText("Uptime")).toBeInTheDocument();
  });

  it("renders value before label in DOM order", () => {
    const { container } = render(<StatItem value="500+" label="Customers" />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs[0].textContent).toBe("500+");
    expect(paragraphs[1].textContent).toBe("Customers");
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatItem value="10K" label="Users" className="text-center" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("text-center");
  });
});
