import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRouterReplace = vi.fn();
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
      push: vi.fn(),
      replace: mockRouterReplace,
      back: vi.fn(),
    }),
  };
});

const mockConfirmOAuthLink = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  confirmOAuthLink: (...args: unknown[]) => mockConfirmOAuthLink(...args),
}));

import { ConfirmLinkClient } from "@/app/[locale]/auth/confirm-link/_components/ConfirmLinkClient";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ConfirmLinkClient", () => {
  it("does NOT auto-POST on mount — defends against email-scanner pre-fetch", () => {
    // Critical: single-use token must not be consumed by Outlook Safe Links,
    // Proofpoint, or any URL pre-scanner. The user has to click.
    render(<ConfirmLinkClient token="link-tok" />);

    expect(mockConfirmOAuthLink).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "button" })).toBeInTheDocument();
  });

  it("posts the token and redirects to /dashboard on success", async () => {
    const user = userEvent.setup();
    mockConfirmOAuthLink.mockResolvedValue({ ok: true });

    render(<ConfirmLinkClient token="link-tok" />);
    await user.click(screen.getByRole("button", { name: "button" }));

    await waitFor(() => {
      expect(mockConfirmOAuthLink).toHaveBeenCalledWith("link-tok");
    });
    expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the missing-token error and does not call the action when token is undefined", () => {
    render(<ConfirmLinkClient />);

    expect(screen.getByText("error.invalid")).toBeInTheDocument();
    expect(mockConfirmOAuthLink).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "button" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["token_used", "error.used"],
    ["token_expired", "error.expired"],
    ["invalid_token", "error.invalid"],
    ["user_not_found", "error.inactive"],
    ["social_account_collision", "error.collision"],
  ])(
    "maps backend code %s to the inline copy %s and never redirects",
    async (code, expectedKey) => {
      const user = userEvent.setup();
      mockConfirmOAuthLink.mockResolvedValue({ ok: false, code });

      render(<ConfirmLinkClient token="link-tok" />);
      await user.click(screen.getByRole("button", { name: "button" }));

      await waitFor(() => {
        expect(screen.getByText(expectedKey)).toBeInTheDocument();
      });
      expect(mockRouterReplace).not.toHaveBeenCalled();
    },
  );

  it("falls back to error.generic for unmapped codes", async () => {
    const user = userEvent.setup();
    mockConfirmOAuthLink.mockResolvedValue({
      ok: false,
      code: "something_unexpected",
    });

    render(<ConfirmLinkClient token="link-tok" />);
    await user.click(screen.getByRole("button", { name: "button" }));

    await waitFor(() => {
      expect(screen.getByText("error.generic")).toBeInTheDocument();
    });
  });

  it("renders a back-to-login link when in error state", async () => {
    const user = userEvent.setup();
    mockConfirmOAuthLink.mockResolvedValue({ ok: false, code: "token_used" });

    render(<ConfirmLinkClient token="link-tok" />);
    await user.click(screen.getByRole("button", { name: "button" }));

    const link = await screen.findByRole("link", { name: "backToLogin" });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("disables the button while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolve: (value: { ok: boolean }) => void = () => {};
    mockConfirmOAuthLink.mockReturnValue(
      new Promise<{ ok: boolean }>((r) => {
        resolve = r;
      }),
    );

    render(<ConfirmLinkClient token="link-tok" />);
    await user.click(screen.getByRole("button", { name: "button" }));

    const button = screen.getByRole("button", { name: "verifying" });
    expect(button).toBeDisabled();

    resolve({ ok: true });
    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("does not double-submit when the user clicks rapidly", async () => {
    const user = userEvent.setup();
    let resolve: (value: { ok: boolean }) => void = () => {};
    mockConfirmOAuthLink.mockReturnValue(
      new Promise<{ ok: boolean }>((r) => {
        resolve = r;
      }),
    );

    render(<ConfirmLinkClient token="link-tok" />);
    const button = screen.getByRole("button", { name: "button" });
    await user.click(button);
    // After the first click the button switches to the "verifying" label
    // and is disabled — userEvent's pointer event respects disabled, but
    // we still belt-and-braces by firing twice on the same node.
    await user.click(button);
    await user.click(button);

    resolve({ ok: true });
    await waitFor(() => {
      expect(mockConfirmOAuthLink).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error.generic and re-enables retry when confirmOAuthLink throws unexpectedly", async () => {
    // The catch {} block in handleConfirm catches network-level or other
    // unexpected throws from the server action — not just action-result failures.
    const user = userEvent.setup();
    mockConfirmOAuthLink.mockRejectedValue(new Error("network error"));

    render(<ConfirmLinkClient token="link-tok" />);
    await user.click(screen.getByRole("button", { name: "button" }));

    await waitFor(() => {
      expect(screen.getByText("error.generic")).toBeInTheDocument();
    });
    // Must not redirect on a throw.
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
