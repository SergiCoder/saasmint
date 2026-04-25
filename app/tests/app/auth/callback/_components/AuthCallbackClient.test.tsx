import { render, screen, waitFor } from "@testing-library/react";
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

const mockExchangeOAuthCode = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  exchangeOAuthCode: (...args: unknown[]) => mockExchangeOAuthCode(...args),
}));

import { AuthCallbackClient } from "@/app/[locale]/auth/callback/_components/AuthCallbackClient";

const LABELS = {
  completingLabel: "Completing",
  noscriptLabel: "JS required",
  backToLoginLabel: "Back to login",
};

function setHash(hash: string): void {
  window.history.replaceState(null, "", "/en/auth/callback" + hash);
}

beforeEach(() => {
  vi.clearAllMocks();
  setHash("");
});

describe("AuthCallbackClient", () => {
  it("extracts code from the URL fragment and calls exchangeOAuthCode", async () => {
    mockExchangeOAuthCode.mockResolvedValue({ ok: true, next: "/dashboard" });
    setHash("#code=opaque_abc&state=xyz");

    render(<AuthCallbackClient {...LABELS} />);

    await waitFor(() => {
      expect(mockExchangeOAuthCode).toHaveBeenCalledWith("opaque_abc");
    });
  });

  it("scrubs the hash from history after reading it (defense in depth)", async () => {
    mockExchangeOAuthCode.mockResolvedValue({ ok: true, next: "/dashboard" });
    setHash("#code=opaque_abc");

    render(<AuthCallbackClient {...LABELS} />);

    await waitFor(() => {
      expect(window.location.hash).toBe("");
    });
  });

  it("redirects to next path when exchange succeeds", async () => {
    mockExchangeOAuthCode.mockResolvedValue({
      ok: true,
      next: "/subscription/checkout?plan=price_pro",
    });
    setHash("#code=opaque_abc");

    render(<AuthCallbackClient {...LABELS} />);

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith(
        "/subscription/checkout?plan=price_pro",
      );
    });
  });

  it("redirects to /login with oauth_error when hash contains error", async () => {
    setHash("#error=access_denied");

    render(<AuthCallbackClient {...LABELS} />);

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith(
        "/login?error=oauth_error",
      );
    });
    expect(mockExchangeOAuthCode).not.toHaveBeenCalled();
  });

  it("redirects to /login with oauth_error when code is missing", async () => {
    setHash("");

    render(<AuthCallbackClient {...LABELS} />);

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith(
        "/login?error=oauth_error",
      );
    });
    expect(mockExchangeOAuthCode).not.toHaveBeenCalled();
  });

  it("redirects to /login with oauth_no_flow when server signals missing flow", async () => {
    mockExchangeOAuthCode.mockResolvedValue({
      ok: false,
      error: "oauth_no_flow",
    });
    setHash("#code=opaque_abc");

    render(<AuthCallbackClient {...LABELS} />);

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith(
        "/login?error=oauth_no_flow",
      );
    });
  });

  it("redirects to /login with oauth_error on generic exchange failure", async () => {
    mockExchangeOAuthCode.mockResolvedValue({
      ok: false,
      error: "oauth_error",
    });
    setHash("#code=opaque_abc");

    render(<AuthCallbackClient {...LABELS} />);

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith(
        "/login?error=oauth_error",
      );
    });
  });

  it("shows the fallback UI when the exchange call itself throws", async () => {
    mockExchangeOAuthCode.mockRejectedValue(new Error("network down"));
    setHash("#code=opaque_abc");

    render(<AuthCallbackClient {...LABELS} />);

    await waitFor(() => {
      expect(screen.getByText("JS required")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("renders the loading spinner label initially", () => {
    mockExchangeOAuthCode.mockReturnValue(new Promise(() => {}));
    setHash("#code=opaque_abc");

    render(<AuthCallbackClient {...LABELS} />);

    expect(screen.getByText("Completing")).toBeInTheDocument();
  });
});
