import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MicrosoftIcon } from "@/presentation/components/atoms";

describe("MicrosoftIcon", () => {
  it("renders an SVG element", () => {
    const { container } = render(<MicrosoftIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("applies default className", () => {
    const { container } = render(<MicrosoftIcon />);
    expect(container.querySelector("svg")).toHaveClass("h-5", "w-5");
  });

  it("applies custom className", () => {
    const { container } = render(<MicrosoftIcon className="h-8 w-8" />);
    expect(container.querySelector("svg")).toHaveClass("h-8", "w-8");
  });
});
