import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/presentation/components/atoms";

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  // Variant and size are exposed via data-* attributes rather than asserted
  // through Tailwind class substrings — styling tokens can evolve without
  // rewriting these tests.
  describe("variants", () => {
    it("defaults to primary variant", () => {
      render(<Button>Primary</Button>);
      expect(screen.getByRole("button")).toHaveAttribute(
        "data-variant",
        "primary",
      );
    });

    it.each(["secondary", "ghost", "danger"] as const)(
      "applies %s variant",
      (variant) => {
        render(<Button variant={variant}>{variant}</Button>);
        expect(screen.getByRole("button")).toHaveAttribute(
          "data-variant",
          variant,
        );
      },
    );
  });

  describe("sizes", () => {
    it("defaults to md size", () => {
      render(<Button>Medium</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("data-size", "md");
    });

    it.each(["sm", "lg"] as const)("applies %s size", (size) => {
      render(<Button size={size}>{size}</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("data-size", size);
    });
  });

  describe("loading state", () => {
    it("disables the button when loading", () => {
      render(<Button loading>Submit</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("shows a spinner when loading", () => {
      render(<Button loading>Submit</Button>);
      const btn = screen.getByRole("button");
      const svg = btn.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
    });

    it("does not show a spinner when not loading", () => {
      render(<Button>Submit</Button>);
      const btn = screen.getByRole("button");
      expect(btn.querySelector("svg")).not.toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables the button when disabled prop is set", () => {
      render(<Button disabled>Submit</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("is disabled when both loading and disabled are set", () => {
      render(
        <Button loading disabled>
          Submit
        </Button>,
      );
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  it("fires onClick handler", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when loading", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button loading onClick={handleClick}>
        Click
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    render(<Button className="w-full">Full</Button>);
    expect(screen.getByRole("button").className).toContain("w-full");
  });
});
