import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const mockStartOAuth = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  startOAuth: (...args: unknown[]) => mockStartOAuth(...args),
}));

import { OAuthButtons } from "@/presentation/components/molecules/OAuthButtons";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

describe("OAuthButtons", () => {
  let locationAssignSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    locationAssignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        href: `${APP_URL}/en/login`,
        origin: APP_URL,
        assign: locationAssignSpy,
      },
      writable: true,
    });
    mockStartOAuth.mockImplementation(async (provider: string) => ({
      redirectUrl: `${API_URL}/api/v1/auth/oauth/${provider}/`,
    }));
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

  it("redirects to Django OAuth endpoint on click", async () => {
    render(<OAuthButtons />);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with GitHub/i }),
    );

    await waitFor(() => {
      expect(locationAssignSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/oauth/github/"),
      );
    });
  });

  it("redirects to Google OAuth endpoint", async () => {
    render(<OAuthButtons />);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with Google/i }),
    );

    await waitFor(() => {
      expect(locationAssignSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/oauth/google/"),
      );
    });
  });

  it("redirects to Microsoft OAuth endpoint", async () => {
    render(<OAuthButtons />);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with Microsoft/i }),
    );

    await waitFor(() => {
      expect(locationAssignSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/oauth/microsoft/"),
      );
    });
  });

  it("disables all buttons while a provider is loading", async () => {
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
});
