import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { Input } from "@/presentation/components/atoms";

describe("Input", () => {
  it("renders a text input by default", () => {
    render(<Input aria-label="test input" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("forwards ref to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="test input" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  describe("error state", () => {
    it("applies error styling when error is true", () => {
      render(<Input error aria-label="test input" />);
      const input = screen.getByRole("textbox");
      expect(input.className).toContain("border-red-300");
      expect(input.className).toContain("focus:ring-red-500");
    });

    it("applies normal styling when error is false", () => {
      render(<Input aria-label="test input" />);
      const input = screen.getByRole("textbox");
      expect(input.className).toContain("border-gray-300");
      expect(input.className).toContain("focus:ring-primary-500");
    });
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="test input" />);
    const input = screen.getByRole("textbox");
    await user.type(input, "hello");
    expect(input).toHaveValue("hello");
  });

  it("passes through HTML attributes", () => {
    render(
      <Input
        aria-label="test input"
        placeholder="Enter email"
        type="email"
        disabled
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "Enter email");
    expect(input).toBeDisabled();
  });

  it("applies custom className", () => {
    render(<Input aria-label="test input" className="max-w-sm" />);
    expect(screen.getByRole("textbox").className).toContain("max-w-sm");
  });

  it("has displayName set", () => {
    expect(Input.displayName).toBe("Input");
  });
});
