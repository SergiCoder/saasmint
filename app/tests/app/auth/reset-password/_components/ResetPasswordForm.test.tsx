import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ok, type ActionResult } from "@/lib/actions/ActionResult";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";

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

import { ResetPasswordForm } from "@/app/[locale]/(auth)/reset-password/_components/ResetPasswordForm";

const noopAction = vi.fn(async (): Promise<ActionResult> => ok());

beforeEach(() => {
  mockState.value = null;
});

describe("ResetPasswordForm", () => {
  it("renders password and confirmPassword fields with correct types", () => {
    const { container } = render(<ResetPasswordForm action={noopAction} />);

    const pwdInput = container.querySelector<HTMLInputElement>(
      'input[name="password"]',
    );
    const confirmInput = container.querySelector<HTMLInputElement>(
      'input[name="confirmPassword"]',
    );
    expect(pwdInput).toBeInTheDocument();
    expect(pwdInput).toHaveAttribute("type", "password");
    expect(pwdInput).toBeRequired();

    expect(confirmInput).toBeInTheDocument();
    expect(confirmInput).toHaveAttribute("type", "password");
    expect(confirmInput).toBeRequired();
  });

  it("applies the PASSWORD_MIN_LENGTH constraint to both password fields", () => {
    const { container } = render(<ResetPasswordForm action={noopAction} />);

    const pwdInput = container.querySelector<HTMLInputElement>(
      'input[name="password"]',
    );
    const confirmInput = container.querySelector<HTMLInputElement>(
      'input[name="confirmPassword"]',
    );
    expect(pwdInput).toHaveAttribute("minLength", String(PASSWORD_MIN_LENGTH));
    expect(confirmInput).toHaveAttribute(
      "minLength",
      String(PASSWORD_MIN_LENGTH),
    );
  });

  it("renders a submit button", () => {
    render(<ResetPasswordForm action={noopAction} />);
    expect(screen.getByRole("button", { name: /.+/ })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("injects the token as a hidden input when provided", () => {
    const { container } = render(
      <ResetPasswordForm action={noopAction} token="reset-tok-123" />,
    );

    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="token"]',
    );
    expect(hidden).toBeInTheDocument();
    expect(hidden?.value).toBe("reset-tok-123");
  });

  it("sets the token hidden input to an empty string when token is not provided", () => {
    const { container } = render(<ResetPasswordForm action={noopAction} />);

    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="token"]',
    );
    expect(hidden).toBeInTheDocument();
    expect(hidden?.value).toBe("");
  });

  it("renders the success state with a back-to-login link and no form", () => {
    mockState.value = { ok: true };

    const { container } = render(<ResetPasswordForm action={noopAction} />);

    expect(container.querySelector("form")).not.toBeInTheDocument();
    // Success AlertBanner has role="alert".
    expect(screen.getByRole("alert")).toBeInTheDocument();
    const backLink = screen.getByRole("link", { name: /.+/ });
    expect(backLink).toHaveAttribute("href", "/login");
  });

  it("renders an error banner above the form when the action fails", () => {
    mockState.value = { ok: false, code: "token_expired" };

    const { container } = render(<ResetPasswordForm action={noopAction} />);

    expect(container.querySelector("form")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not render an alert banner in the initial idle state", () => {
    render(<ResetPasswordForm action={noopAction} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
