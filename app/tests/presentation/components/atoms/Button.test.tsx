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

  describe("variants", () => {
    it("defaults to primary variant", () => {
      render(<Button>Primary</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("bg-primary-600");
    });

    it("applies secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("bg-white");
      expect(btn.className).toContain("border-gray-300");
    });

    it("applies ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("text-gray-700");
    });

    it("applies danger variant", () => {
      render(<Button variant="danger">Delete</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("bg-red-600");
    });
  });

  describe("sizes", () => {
    it("defaults to md size", () => {
      render(<Button>Medium</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("px-4");
      expect(btn.className).toContain("py-2");
    });

    it("applies sm size", () => {
      render(<Button size="sm">Small</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("px-3");
      expect(btn.className).toContain("py-1.5");
    });

    it("applies lg size", () => {
      render(<Button size="lg">Large</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("px-6");
      expect(btn.className).toContain("py-3");
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
