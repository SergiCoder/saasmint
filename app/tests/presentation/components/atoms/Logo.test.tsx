import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Logo } from "@/presentation/components/atoms";

describe("Logo", () => {
  it("renders the app name", () => {
    render(<Logo appName="Acme" />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("applies primary-600 brand color", () => {
    render(<Logo appName="Acme" />);
    expect(screen.getByText("Acme").className).toContain("text-primary-600");
  });

  it("applies custom className", () => {
    render(<Logo appName="Acme" className="text-2xl" />);
    expect(screen.getByText("Acme").className).toContain("text-2xl");
  });

  it("renders as a span element", () => {
    const { container } = render(<Logo appName="Acme" />);
    expect(container.querySelector("span")).toBeInTheDocument();
  });
});
