import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

const mockSetRequestLocale = vi.fn();
vi.mock("next-intl/server", () => ({
  setRequestLocale: (locale: string) => mockSetRequestLocale(locale),
}));

const { default: AuthErrorPage } =
  await import("@/app/[locale]/auth/error/page");

async function renderPage(searchParams: { error?: string }, locale = "en") {
  await AuthErrorPage({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(searchParams),
  });
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockSetRequestLocale.mockClear();
});

describe("AuthErrorPage (Django OAuth failure landing)", () => {
  it("redirects unknown codes to /login with generic oauth_error", async () => {
    await expect(renderPage({ error: "exchange_failed" })).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(mockRedirect).toHaveBeenCalledWith("/login?error=oauth_error");
  });

  it("redirects invalid_state / missing_code to /login with generic oauth_error", async () => {
    for (const code of ["invalid_state", "missing_code"]) {
      mockRedirect.mockClear();
      await expect(renderPage({ error: code })).rejects.toThrow(
        /NEXT_REDIRECT/,
      );
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=oauth_error");
    }
  });

  it("passes email_not_verified through to /login unchanged", async () => {
    await expect(renderPage({ error: "email_not_verified" })).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?error=email_not_verified",
    );
  });

  it("passes account_deactivated through to /login unchanged", async () => {
    await expect(renderPage({ error: "account_deactivated" })).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?error=account_deactivated",
    );
  });

  it("redirects missing error to /login with generic oauth_error", async () => {
    await expect(renderPage({})).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockRedirect).toHaveBeenCalledWith("/login?error=oauth_error");
  });

  it("url-encodes the error code to prevent query-injection", async () => {
    // An attacker-controlled error string must not break out of the query param.
    // The normalization step forces any non-passthrough code to "oauth_error",
    // so this also verifies the safelist is applied.
    await expect(renderPage({ error: "malicious&admin=true" })).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(mockRedirect).toHaveBeenCalledWith("/login?error=oauth_error");
  });

  it("calls setRequestLocale with the locale from params", async () => {
    await expect(renderPage({}, "es")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockSetRequestLocale).toHaveBeenCalledWith("es");
  });
});
