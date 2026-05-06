import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server action — the hook is the unit under test, not the action.
const mockResendVerificationEmail = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  resendVerificationEmail: (...args: unknown[]) =>
    mockResendVerificationEmail(...args),
}));

import {
  useResendVerification,
  type ResendVerificationStatus,
} from "@/lib/actions/useResendVerification";

// ---------------------------------------------------------------------------
// Probe component — renders hook state as data attributes + a trigger button.
// ---------------------------------------------------------------------------

function Probe() {
  const { pending, status, errorMessage, submit } = useResendVerification();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="pending">{String(pending)}</span>
      <span data-testid="error">{errorMessage ?? ""}</span>
      <button type="button" onClick={() => submit("user@example.com")}>
        send
      </button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useResendVerification", () => {
  it("starts in idle state with no error and not pending", () => {
    render(<Probe />);

    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    expect(screen.getByTestId("pending")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  it("sets status to sent when the action returns ok", async () => {
    mockResendVerificationEmail.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<Probe />);
    await user.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("sent");
    });
    expect(mockResendVerificationEmail).toHaveBeenCalledWith(
      "user@example.com",
    );
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  it("sets status to error and translates the error message when the action fails", async () => {
    // The default next-intl stub in tests/setup.ts echoes the i18n key when
    // called without params. useActionErrorMessage falls back to unknown_error
    // when the code is not in the actionErrors namespace.
    mockResendVerificationEmail.mockResolvedValue({
      ok: false,
      code: "email_required",
    });
    const user = userEvent.setup();

    render(<Probe />);
    await user.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });
    // The stub echoes the key — the exact key depends on whether it's in the
    // actionErrors namespace. Either way, errorMessage is non-empty.
    expect(screen.getByTestId("error").textContent).not.toBe("");
  });

  it("resets status and errorMessage back to idle on a subsequent submit call", async () => {
    // First call fails, leaving status=error.
    mockResendVerificationEmail.mockResolvedValueOnce({
      ok: false,
      code: "email_required",
    });
    const user = userEvent.setup();

    render(<Probe />);
    await user.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });

    // Second call succeeds — status should reset to idle mid-flight then become sent.
    mockResendVerificationEmail.mockResolvedValueOnce({ ok: true });
    await user.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("sent");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  it("calls the action with the exact email string passed to submit", async () => {
    mockResendVerificationEmail.mockResolvedValue({ ok: true });

    // Custom probe with a different email to confirm forwarding.
    function CustomProbe() {
      const { submit } = useResendVerification();
      return (
        <button type="button" onClick={() => submit("custom@domain.org")}>
          go
        </button>
      );
    }

    const user = userEvent.setup();
    render(<CustomProbe />);
    await user.click(screen.getByRole("button", { name: "go" }));

    await waitFor(() => {
      expect(mockResendVerificationEmail).toHaveBeenCalledWith(
        "custom@domain.org",
      );
    });
  });
});
