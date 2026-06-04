import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LinkButton } from "@/presentation/components/atoms/LinkButton";

describe("LinkButton", () => {
  it("renders an anchor element with the given href", () => {
    render(<LinkButton href="/dashboard">Go to dashboard</LinkButton>);
    const link = screen.getByRole("link", { name: "Go to dashboard" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders children text inside the anchor", () => {
    render(<LinkButton href="/pricing">Get started</LinkButton>);
    expect(screen.getByText("Get started")).toBeInTheDocument();
  });

  // Variant and size are exposed as data-* attributes so tests stay green
  // when Tailwind class tokens evolve.
  describe("variants", () => {
    it("defaults to primary variant", () => {
      render(<LinkButton href="/">Primary</LinkButton>);
      expect(screen.getByRole("link")).toHaveAttribute(
        "data-variant",
        "primary",
      );
    });

    it("applies secondary variant when specified", () => {
      render(
        <LinkButton href="/" variant="secondary">
          Secondary
        </LinkButton>,
      );
      expect(screen.getByRole("link")).toHaveAttribute(
        "data-variant",
        "secondary",
      );
    });
  });

  describe("sizes", () => {
    it("defaults to md size", () => {
      render(<LinkButton href="/">Medium</LinkButton>);
      expect(screen.getByRole("link")).toHaveAttribute("data-size", "md");
    });

    it.each(["sm", "lg"] as const)("applies %s size when specified", (size) => {
      render(
        <LinkButton href="/" size={size}>
          {size}
        </LinkButton>,
      );
      expect(screen.getByRole("link")).toHaveAttribute("data-size", size);
    });
  });

  describe("fullWidth", () => {
    it("adds w-full class when fullWidth is true", () => {
      render(
        <LinkButton href="/" fullWidth>
          Full width
        </LinkButton>,
      );
      expect(screen.getByRole("link").className).toContain("w-full");
    });

    it("does not add w-full class by default", () => {
      render(<LinkButton href="/">Normal width</LinkButton>);
      expect(screen.getByRole("link").className).not.toContain("w-full");
    });
  });

  it("merges custom className with generated classes", () => {
    render(
      <LinkButton href="/" className="my-custom-class">
        Custom
      </LinkButton>,
    );
    expect(screen.getByRole("link").className).toContain("my-custom-class");
  });

  it("forwards additional anchor props (e.g. target, rel)", () => {
    render(
      <LinkButton href="https://example.com" target="_blank" rel="noopener">
        External
      </LinkButton>,
    );
    const link = screen.getByRole("link", { name: "External" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });
});
