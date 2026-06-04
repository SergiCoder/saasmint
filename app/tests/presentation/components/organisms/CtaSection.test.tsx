import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ActionResult } from "@/lib/actions/ActionResult";

vi.mock("@/app/actions/marketing", () => ({
  submitInquiry: vi.fn(),
}));

// Stub `useActionState` so tests can drive the rendered state through the
// success/error branches without actually invoking the server action.
const mockState = vi.hoisted(
  () => ({ value: null }) as { value: ActionResult | null },
);

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: <S, P>(_action: unknown, _initial: S) =>
      [mockState.value as S, (_payload: P) => {}, false] as const,
  };
});

import { CtaSection } from "@/presentation/components/organisms";

beforeEach(() => {
  mockState.value = null;
});

const defaultProps = {
  label: "Get Started",
  title: "Ready to launch?",
  subtitle: "Start your free trial today.",
  inputPlaceholder: "you@example.com",
  buttonText: "Sign Up",
  successTitle: "Thanks!",
  successBody: "We'll be in touch shortly.",
};

describe("CtaSection", () => {
  it("renders label, title, and subtitle", () => {
    render(<CtaSection {...defaultProps} />);
    expect(screen.getByText("Get Started")).toBeInTheDocument();
    expect(screen.getByText("Ready to launch?")).toBeInTheDocument();
    expect(
      screen.getByText("Start your free trial today."),
    ).toBeInTheDocument();
  });

  it("renders an email input with the given placeholder", () => {
    render(<CtaSection {...defaultProps} />);
    const input = screen.getByPlaceholderText("you@example.com");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "email");
  });

  it("renders a button with the given text", () => {
    render(<CtaSection {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
  });

  it("renders as a section element", () => {
    const { container } = render(<CtaSection {...defaultProps} />);
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <CtaSection {...defaultProps} className="bg-gray-50" />,
    );
    const section = container.querySelector("section") as HTMLElement;
    expect(section.className).toContain("bg-gray-50");
  });

  it("includes a hidden source input pinning the inquiry to landing-cta", () => {
    const { container } = render(<CtaSection {...defaultProps} />);
    const source = container.querySelector(
      'input[type="hidden"][name="source"]',
    ) as HTMLInputElement | null;
    expect(source?.value).toBe("landing-cta");
  });

  it("includes a visually-hidden honeypot input bots will fill", () => {
    const { container } = render(<CtaSection {...defaultProps} />);
    const honeypot = container.querySelector(
      'input[name="honeypot"]',
    ) as HTMLInputElement | null;

    expect(honeypot).not.toBeNull();
    expect(honeypot?.tabIndex).toBe(-1);
    expect(honeypot?.getAttribute("aria-hidden")).toBe("true");
    // Off-screen via positioning, not display:none — bots that respect
    // display:none would otherwise skip the field and defeat the trap.
    expect(honeypot?.className).toMatch(/-left-\[9999px\]/);
  });

  it("swaps the form for the success message when the action succeeds", () => {
    mockState.value = { ok: true };
    const { container } = render(<CtaSection {...defaultProps} />);

    expect(screen.getByText("Thanks!")).toBeInTheDocument();
    expect(screen.getByText("We'll be in touch shortly.")).toBeInTheDocument();
    // Pre-submit copy & form are gone.
    expect(screen.queryByText("Ready to launch?")).toBeNull();
    expect(screen.queryByText("Start your free trial today.")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign Up" })).toBeNull();
  });

  it("renders an error AlertBanner when the action fails", () => {
    mockState.value = {
      ok: false,
      code: "HTTP_429",
    };
    render(<CtaSection {...defaultProps} />);

    const alert = screen.getByRole("alert");
    // i18n stub falls back to "unknown_error" because actionErrors namespace
    // is empty in the global mock.
    expect(alert).toHaveTextContent("unknown_error");
    // Pre-submit form is still rendered so the user can retry.
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
  });
});
