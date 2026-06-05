import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ok, type ActionResult } from "@/lib/actions/ActionResult";

// Stub useActionState to control the form's rendered state without invoking a
// real server action. Mirrors the pattern used in AuthForm.test.tsx.
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

import { ForgotPasswordForm } from "@/app/[locale]/(auth)/forgot-password/_components/ForgotPasswordForm";

const noopAction = vi.fn(async (): Promise<ActionResult> => ok());

beforeEach(() => {
  mockState.value = null;
});

describe("ForgotPasswordForm", () => {
  it("renders an email field and a submit button", () => {
    const { container } = render(<ForgotPasswordForm action={noopAction} />);

    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toBeRequired();

    expect(screen.getByRole("button", { name: /.+/ })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("renders a back-to-login link", () => {
    render(<ForgotPasswordForm action={noopAction} />);

    const links = screen.getAllByRole("link");
    const backLink = links.find((a) => a.getAttribute("href") === "/login");
    expect(backLink).toBeInTheDocument();
  });

  it("renders a success banner and hides the form when the action returns ok", () => {
    mockState.value = { ok: true };

    const { container } = render(<ForgotPasswordForm action={noopAction} />);

    // Form should not be rendered in the success state.
    expect(container.querySelector("form")).not.toBeInTheDocument();
    // The AlertBanner has role="alert".
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders an error banner above the form when the action returns a failure", () => {
    mockState.value = { ok: false, code: "unknown_error" };

    const { container } = render(<ForgotPasswordForm action={noopAction} />);

    // Form is still present.
    expect(container.querySelector("form")).toBeInTheDocument();
    // Error alert is shown.
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not render an alert banner in the initial idle state", () => {
    render(<ForgotPasswordForm action={noopAction} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
