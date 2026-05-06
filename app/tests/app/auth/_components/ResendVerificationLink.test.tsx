import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResendVerificationStatus } from "@/lib/actions/useResendVerification";

// Controllable stub for the useResendVerification hook so tests can drive
// the component's rendered state without invoking the real server action.
const mockSubmit = vi.fn();
const mockHookState = vi.hoisted(() => ({
  pending: false,
  status: "idle" as ResendVerificationStatus,
  errorMessage: null as string | null,
  submit: (...args: unknown[]) => mockSubmit(...args),
}));

vi.mock("@/lib/actions/useResendVerification", () => ({
  useResendVerification: () => mockHookState,
}));

import { ResendVerificationLink } from "@/app/[locale]/(auth)/_components/ResendVerificationLink";

beforeEach(() => {
  vi.clearAllMocks();
  mockHookState.pending = false;
  mockHookState.status = "idle";
  mockHookState.errorMessage = null;
});

// ---------------------------------------------------------------------------
// When an email prop is provided (known address — e.g. from AuthForm state)
// ---------------------------------------------------------------------------

describe("ResendVerificationLink — with email prop", () => {
  it("renders a single resend button and no email input", () => {
    render(<ResendVerificationLink email="user@example.com" />);

    expect(
      screen.getByRole("button", { name: "resendVerification" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("calls hook submit with the provided email on click", async () => {
    const user = userEvent.setup();

    render(<ResendVerificationLink email="user@example.com" />);
    await user.click(
      screen.getByRole("button", { name: "resendVerification" }),
    );

    expect(mockSubmit).toHaveBeenCalledWith("user@example.com");
  });

  it("renders the confirmation message when hook status is sent", () => {
    mockHookState.status = "sent";

    render(<ResendVerificationLink email="user@example.com" />);

    expect(screen.getByText("verificationEmailSent")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "resendVerification" }),
    ).not.toBeInTheDocument();
  });

  it("renders an error message and keeps the button when hook status is error", () => {
    mockHookState.status = "error";
    mockHookState.errorMessage = "Too many requests.";

    render(<ResendVerificationLink email="user@example.com" />);

    expect(screen.getByText("Too many requests.")).toBeInTheDocument();
    // Button stays so the user can retry.
    expect(
      screen.getByRole("button", { name: "resendVerification" }),
    ).toBeInTheDocument();
  });

  it("does not render an error paragraph when status is error but errorMessage is null", () => {
    mockHookState.status = "error";
    mockHookState.errorMessage = null;

    render(<ResendVerificationLink email="user@example.com" />);

    // No stray empty error paragraph.
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("disables the button while hook pending is true", () => {
    mockHookState.pending = true;

    render(<ResendVerificationLink email="user@example.com" />);

    expect(
      screen.getByRole("button", { name: "resendVerification" }),
    ).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// When no email prop is provided (unknown address — user must type it)
// ---------------------------------------------------------------------------

describe("ResendVerificationLink — without email prop", () => {
  it("renders an email input and a send button, with the button initially disabled", () => {
    render(<ResendVerificationLink />);

    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
    expect(
      screen.getByRole("button", { name: "resendVerification" }),
    ).toBeDisabled();
  });

  it("enables the button once a non-empty email is typed", async () => {
    const user = userEvent.setup();
    render(<ResendVerificationLink />);

    await user.type(screen.getByRole("textbox"), "typed@example.com");

    expect(
      screen.getByRole("button", { name: "resendVerification" }),
    ).toBeEnabled();
  });

  it("keeps the button disabled when the input contains only whitespace", async () => {
    const user = userEvent.setup();
    render(<ResendVerificationLink />);

    await user.type(screen.getByRole("textbox"), "   ");

    expect(
      screen.getByRole("button", { name: "resendVerification" }),
    ).toBeDisabled();
  });

  it("calls hook submit with the typed email on click", async () => {
    const user = userEvent.setup();

    render(<ResendVerificationLink />);

    await user.type(screen.getByRole("textbox"), "typed@example.com");
    await user.click(
      screen.getByRole("button", { name: "resendVerification" }),
    );

    expect(mockSubmit).toHaveBeenCalledWith("typed@example.com");
  });

  it("does not call hook submit when the button is clicked with an empty input", async () => {
    const user = userEvent.setup();
    // Directly enable the button to simulate a click with empty value — the
    // onClick guard `typedEmail.trim() && submit(...)` should still block the call.
    render(<ResendVerificationLink />);

    // Button is disabled when input is empty, so the click is a no-op via
    // HTML disabled. Verify the mock was never reached.
    const button = screen.getByRole("button", { name: "resendVerification" });
    expect(button).toBeDisabled();
    await user.click(button);

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("renders the confirmation message when hook status is sent", () => {
    mockHookState.status = "sent";

    render(<ResendVerificationLink />);

    expect(screen.getByText("verificationEmailSent")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "resendVerification" }),
    ).not.toBeInTheDocument();
  });

  it("renders an error message and keeps the form when hook status is error", () => {
    mockHookState.status = "error";
    mockHookState.errorMessage = "Too many requests.";

    render(<ResendVerificationLink />);

    expect(screen.getByText("Too many requests.")).toBeInTheDocument();
    // Input and button are still present so the user can correct and retry.
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "resendVerification" }),
    ).toBeInTheDocument();
  });

  it("disables the button while hook pending is true, even with a valid email typed", async () => {
    mockHookState.pending = true;
    const user = userEvent.setup();

    render(<ResendVerificationLink />);

    await user.type(screen.getByRole("textbox"), "typed@example.com");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "resendVerification" }),
      ).toBeDisabled();
    });
  });
});

// ---------------------------------------------------------------------------
// Edge cases — email prop is provided as an empty string
// ---------------------------------------------------------------------------

describe("ResendVerificationLink — with empty string email prop", () => {
  it("renders the button (email prop path) but keeps it disabled when email is empty string", () => {
    // email="" satisfies `email !== undefined`, so we get the single-button
    // variant, but `!email.trim()` evaluates to true which disables the button.
    render(<ResendVerificationLink email="" />);

    expect(
      screen.getByRole("button", { name: "resendVerification" }),
    ).toBeDisabled();
    // No separate text input — we are in the known-email branch.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not call hook submit when the button is clicked with an empty email prop", async () => {
    const user = userEvent.setup();
    render(<ResendVerificationLink email="" />);

    const button = screen.getByRole("button", { name: "resendVerification" });
    // HTML disabled prevents the event from firing naturally; userEvent
    // respects disabled — the mock should never be called.
    await user.click(button);

    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
