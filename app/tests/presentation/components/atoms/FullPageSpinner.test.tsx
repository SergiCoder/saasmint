import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FullPageSpinner } from "@/presentation/components/atoms";

describe("FullPageSpinner", () => {
  it("renders a Spinner SVG inside a centered container", () => {
    const { container } = render(<FullPageSpinner />);

    const wrapper = container.firstChild as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    const cls = wrapper?.getAttribute("class") ?? "";
    expect(cls).toContain("flex");
    expect(cls).toContain("items-center");
    expect(cls).toContain("justify-center");
    expect(cls).toContain("min-h-[50vh]");
  });

  it("uses the lg Spinner size", () => {
    const { container } = render(<FullPageSpinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const svgCls = svg?.getAttribute("class") ?? "";
    expect(svgCls).toContain("animate-spin");
    expect(svgCls).toContain("h-8");
    expect(svgCls).toContain("w-8");
  });
});
