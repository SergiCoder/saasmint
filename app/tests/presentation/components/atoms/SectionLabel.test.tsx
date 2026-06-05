import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SectionLabel } from "@/presentation/components/atoms";

describe("SectionLabel", () => {
  it("renders children text", () => {
    render(<SectionLabel>Features</SectionLabel>);
    expect(screen.getByText("Features")).toBeInTheDocument();
  });

  it("renders as a p element", () => {
    render(<SectionLabel>Features</SectionLabel>);
    const label = screen.getByText("Features");
    expect(label.tagName).toBe("P");
  });

  it("includes uppercase styling", () => {
    render(<SectionLabel>Features</SectionLabel>);
    const label = screen.getByText("Features");
    expect(label.className).toContain("uppercase");
  });

  it("does not center by default", () => {
    render(<SectionLabel>Features</SectionLabel>);
    const label = screen.getByText("Features");
    expect(label.className).not.toContain("justify-center");
  });

  it("applies justify-center when centered is true", () => {
    render(<SectionLabel centered>Features</SectionLabel>);
    const label = screen.getByText("Features");
    expect(label.className).toContain("justify-center");
  });

  it("applies custom className", () => {
    render(<SectionLabel className="mt-8">Features</SectionLabel>);
    const label = screen.getByText("Features");
    expect(label.className).toContain("mt-8");
  });

  it("renders the decorative bar span", () => {
    const { container } = render(<SectionLabel>Features</SectionLabel>);
    const bar = container.querySelector("span");
    expect(bar).toBeInTheDocument();
    expect(bar!.className).toContain("bg-primary-600");
  });
});
