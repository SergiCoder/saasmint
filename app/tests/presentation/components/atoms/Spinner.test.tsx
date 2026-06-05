import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Spinner } from "@/presentation/components/atoms";

function getSvgClass(container: HTMLElement): string {
  return container.querySelector("svg")?.getAttribute("class") ?? "";
}

describe("Spinner", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("applies animate-spin class", () => {
    const { container } = render(<Spinner />);
    expect(getSvgClass(container)).toContain("animate-spin");
  });

  describe("sizes", () => {
    it("defaults to md size", () => {
      const { container } = render(<Spinner />);
      const cls = getSvgClass(container);
      expect(cls).toContain("h-6");
      expect(cls).toContain("w-6");
    });

    it("applies sm size", () => {
      const { container } = render(<Spinner size="sm" />);
      const cls = getSvgClass(container);
      expect(cls).toContain("h-4");
      expect(cls).toContain("w-4");
    });

    it("applies lg size", () => {
      const { container } = render(<Spinner size="lg" />);
      const cls = getSvgClass(container);
      expect(cls).toContain("h-8");
      expect(cls).toContain("w-8");
    });
  });

  it("applies custom className", () => {
    const { container } = render(<Spinner className="text-blue-500" />);
    expect(getSvgClass(container)).toContain("text-blue-500");
  });
});
