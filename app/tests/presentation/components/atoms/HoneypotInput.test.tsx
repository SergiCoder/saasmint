import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HoneypotInput } from "@/presentation/components/atoms/HoneypotInput";

describe("HoneypotInput", () => {
  it("renders a text input named 'honeypot'", () => {
    const { container } = render(<HoneypotInput />);
    const input = container.querySelector(
      'input[type="text"][name="honeypot"]',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
  });

  it("is aria-hidden so screen readers skip it", () => {
    const { container } = render(<HoneypotInput />);
    const input = container.querySelector("input");
    expect(input?.getAttribute("aria-hidden")).toBe("true");
  });

  it("has tabIndex -1 so keyboard users tab past it", () => {
    const { container } = render(<HoneypotInput />);
    const input = container.querySelector("input") as HTMLInputElement | null;
    expect(input?.tabIndex).toBe(-1);
  });

  it("disables autocomplete so browsers do not prefill it", () => {
    const { container } = render(<HoneypotInput />);
    const input = container.querySelector("input");
    expect(input?.getAttribute("autocomplete")).toBe("off");
  });

  it("positions the input off-screen so bots can still find it", () => {
    const { container } = render(<HoneypotInput />);
    const input = container.querySelector("input");
    // The off-screen class is the honeypot's core anti-spam mechanism.
    expect(input?.className).toMatch(/-left-\[9999px\]/);
  });
});
