import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FeatureCard } from "@/presentation/components/molecules";

describe("FeatureCard", () => {
  it("renders icon, title, and description", () => {
    render(
      <FeatureCard icon={<span>🚀</span>} title="Fast" description="Blazing speed" />,
    );
    expect(screen.getByText("🚀")).toBeInTheDocument();
    expect(screen.getByText("Fast")).toBeInTheDocument();
    expect(screen.getByText("Blazing speed")).toBeInTheDocument();
  });

  it("renders icon as arbitrary React node", () => {
    render(
      <FeatureCard
        icon={<svg data-testid="custom-icon" />}
        title="Custom"
        description="desc"
      />,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <FeatureCard
        icon={<span>X</span>}
        title="Title"
        description="Desc"
        className="col-span-2"
      />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("col-span-2");
  });

  it("renders title in an h3 element", () => {
    render(
      <FeatureCard icon={<span>X</span>} title="Heading" description="Desc" />,
    );
    const heading = screen.getByText("Heading");
    expect(heading.tagName).toBe("H3");
  });

  it("renders description in a p element", () => {
    render(
      <FeatureCard icon={<span>X</span>} title="T" description="Body text" />,
    );
    const desc = screen.getByText("Body text");
    expect(desc.tagName).toBe("P");
  });
});
