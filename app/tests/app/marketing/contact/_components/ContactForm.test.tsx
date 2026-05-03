import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ActionResult } from "@/lib/actions/ActionResult";

vi.mock("@/app/actions/marketing", () => ({
  submitInquiry: vi.fn(),
}));

// Stub `useActionState` so tests can drive the form's rendered state through
// the success/error branches without actually invoking the server action.
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

import { ContactForm } from "@/app/[locale]/(marketing)/contact/_components/ContactForm";

beforeEach(() => {
  mockState.value = null;
});

const baseProps = {
  placeholder: "Your email",
  messagePlaceholder: "Your message",
  submitLabel: "Send",
  successTitle: "Message sent",
  successBody: "Thanks!",
};

describe("ContactForm", () => {
  it("renders the email and message fields with the source hidden input", () => {
    const { container } = render(<ContactForm {...baseProps} />);

    const source = container.querySelector(
      'input[type="hidden"][name="source"]',
    ) as HTMLInputElement | null;
    expect(source?.value).toBe("contact-page");

    expect(
      container.querySelector('input[type="email"][name="email"]'),
    ).not.toBeNull();
    expect(container.querySelector('textarea[name="message"]')).not.toBeNull();
  });

  it("includes a hidden honeypot input that's accessible to bots but not users", () => {
    const { container } = render(<ContactForm {...baseProps} />);
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

  it("caps the textarea length at 5000 characters", () => {
    const { container } = render(<ContactForm {...baseProps} />);
    const textarea = container.querySelector(
      'textarea[name="message"]',
    ) as HTMLTextAreaElement | null;
    expect(textarea?.maxLength).toBe(5000);
  });

  it("renders the submit button with the provided label", () => {
    render(<ContactForm {...baseProps} />);
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("renders the success card and hides the form when the action succeeds", () => {
    mockState.value = { ok: true };
    const { container } = render(<ContactForm {...baseProps} />);

    expect(screen.getByText("Message sent")).toBeInTheDocument();
    expect(screen.getByText("Thanks!")).toBeInTheDocument();
    // Form is gone — no email/message inputs and no submit button.
    expect(container.querySelector("form")).toBeNull();
    expect(
      container.querySelector('input[type="email"][name="email"]'),
    ).toBeNull();
    expect(container.querySelector('textarea[name="message"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
  });

  it("renders an error AlertBanner with the action message when the action fails", () => {
    mockState.value = {
      ok: false,
      code: "HTTP_429",
      message: "Too many requests, slow down.",
    };
    render(<ContactForm {...baseProps} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Too many requests, slow down.");
    // Form is still rendered so the user can correct & retry.
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });
});
