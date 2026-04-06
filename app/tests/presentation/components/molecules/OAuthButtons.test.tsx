import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSignInWithOAuth = vi.fn();
vi.mock("@/infrastructure/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      continueWithGoogle: "Continue with Google",
      continueWithGitHub: "Continue with GitHub",
      continueWithMicrosoft: "Continue with Microsoft",
      divider: "or",
    };
    return map[key] ?? key;
  },
}));

import { OAuthButtons } from "@/presentation/components/molecules/OAuthButtons";

describe("OAuthButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders three provider buttons", () => {
    render(<OAuthButtons />);
    expect(
      screen.getByRole("button", { name: /Continue with Google/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Continue with GitHub/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Continue with Microsoft/i }),
    ).toBeInTheDocument();
  });

  it("renders the divider text", () => {
    render(<OAuthButtons />);
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("calls signInWithOAuth with the correct provider on click", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(<OAuthButtons />);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with GitHub/i }),
    );

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    });
  });

  it("calls signInWithOAuth with google provider", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(<OAuthButtons />);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with Google/i }),
    );

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google" }),
      );
    });
  });

  it("calls signInWithOAuth with azure provider for Microsoft", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(<OAuthButtons />);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with Microsoft/i }),
    );

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "azure" }),
      );
    });
  });

  it("disables all buttons while a provider is loading", async () => {
    // Never resolve so loading state persists
    mockSignInWithOAuth.mockReturnValue(new Promise(() => {}));

    render(<OAuthButtons />);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with Google/i }),
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button).toBeDisabled();
      }
    });
  });

  it("re-enables buttons when signInWithOAuth returns an error", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      error: { message: "OAuth failed" },
    });

    render(<OAuthButtons />);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with Google/i }),
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button).not.toBeDisabled();
      }
    });
  });
});
