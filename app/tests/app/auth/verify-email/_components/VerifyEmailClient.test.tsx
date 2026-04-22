import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRouterPush = vi.fn();
vi.mock("@/lib/i18n/navigation", async () => {
  const React = await import("react");
  return {
    Link: ({
      href,
      children,
      ...props
    }: {
      href: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement("a", { href, ...props }, children),
    useRouter: () => ({
      push: mockRouterPush,
      replace: vi.fn(),
      back: vi.fn(),
    }),
  };
});

const mockVerifyEmail = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  verifyEmail: (...args: unknown[]) => mockVerifyEmail(...args),
}));

import { VerifyEmailClient } from "@/app/[locale]/(auth)/verify-email/_components/VerifyEmailClient";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VerifyEmailClient", () => {
  it("calls verifyEmail once with the token on mount", async () => {
    mockVerifyEmail.mockResolvedValue({ ok: true, data: {} });

    render(<VerifyEmailClient token="tok_abc" />);

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith("tok_abc");
    });
    expect(mockVerifyEmail).toHaveBeenCalledTimes(1);
  });

  it("pushes to /dashboard on success when no pendingPlan is returned", async () => {
    mockVerifyEmail.mockResolvedValue({ ok: true, data: {} });

    render(<VerifyEmailClient token="tok_abc" />);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("pushes to the personal checkout path when pendingPlan is returned", async () => {
    mockVerifyEmail.mockResolvedValue({
      ok: true,
      data: { pendingPlan: "price_pro", isTeamPlan: false },
    });

    render(<VerifyEmailClient token="tok_abc" />);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/subscription/checkout?plan=price_pro",
      );
    });
  });

  it("pushes to the team checkout path when pendingPlan + isTeamPlan", async () => {
    mockVerifyEmail.mockResolvedValue({
      ok: true,
      data: { pendingPlan: "price_team_pro", isTeamPlan: true },
    });

    render(<VerifyEmailClient token="tok_abc" />);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/subscription/team-checkout?plan=price_team_pro",
      );
    });
  });

  it("renders the translated error from the envelope code", async () => {
    mockVerifyEmail.mockResolvedValue({ ok: false, code: "token_expired" });

    render(<VerifyEmailClient token="tok_abc" />);

    // The next-intl mock echoes the key, and useActionErrorMessage falls back
    // to `unknown_error` when the code is not in the known messages set.
    await waitFor(() => {
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("renders the generic error when verifyEmail throws", async () => {
    mockVerifyEmail.mockRejectedValue(new Error("network down"));

    render(<VerifyEmailClient token="tok_abc" />);

    await waitFor(() => {
      expect(screen.getByText("error")).toBeInTheDocument();
    });
  });

  it("shows the verifying spinner when no error has occurred yet", () => {
    mockVerifyEmail.mockReturnValue(new Promise(() => {}));

    render(<VerifyEmailClient token="tok_abc" />);

    expect(screen.getByText("verifying")).toBeInTheDocument();
  });

  it("shows the missing-token error when token prop is undefined (no API call)", () => {
    render(<VerifyEmailClient />);

    expect(screen.getByText("error")).toBeInTheDocument();
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it("renders a Back-to-login link when in error state", async () => {
    mockVerifyEmail.mockResolvedValue({ ok: false, code: "already_used" });

    render(<VerifyEmailClient token="tok_abc" />);

    const link = await screen.findByRole("link", { name: "backToLogin" });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("fires verifyEmail only once across re-renders (StrictMode-safe guard)", async () => {
    mockVerifyEmail.mockResolvedValue({ ok: true, data: {} });

    const { rerender } = render(<VerifyEmailClient token="tok_abc" />);

    rerender(<VerifyEmailClient token="tok_abc" />);
    rerender(<VerifyEmailClient token="tok_abc" />);

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledTimes(1);
    });
  });
});
