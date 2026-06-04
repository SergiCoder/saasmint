import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---------------------------------------------------------------

const setRequestLocaleMock = vi.fn();
const mockTranslate = vi.fn((key: string) => key);
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => Promise.resolve(mockTranslate)),
  setRequestLocale: (locale: string) => setRequestLocaleMock(locale),
}));

// Stub the client component so its useEffect/server-action wiring doesn't
// run during this server-page test. We just want to confirm the page mounts
// it with the right token prop.
vi.mock(
  "@/app/[locale]/(auth)/verify-email/_components/VerifyEmailClient",
  () => ({
    VerifyEmailClient: ({ token }: { token?: string }) =>
      React.createElement("div", {
        "data-testid": "verify-email-client",
        "data-token": token ?? "",
        "data-has-token": String(token !== undefined),
      }),
  }),
);

vi.mock("@/presentation/components/templates/AuthLayout", () => ({
  AuthLayout: ({
    title,
    appName,
    children,
  }: {
    title: string;
    appName: string;
    children: React.ReactNode;
  }) =>
    React.createElement(
      "div",
      {
        "data-testid": "auth-layout",
        "data-title": title,
        "data-app": appName,
      },
      children,
    ),
}));

// --- Import under test (after mocks) -------------------------------------

const pageModule = await import("@/app/[locale]/(auth)/verify-email/page");
const VerifyEmailPage = pageModule.default;
const { generateMetadata } = pageModule;

// --- Helpers -------------------------------------------------------------

async function renderPage(searchParams: { token?: string }) {
  const jsx = await VerifyEmailPage({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(jsx as React.ReactElement);
}

// --- Tests ---------------------------------------------------------------

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls setRequestLocale with the locale from params", async () => {
    await renderPage({ token: "tok_123" });
    expect(setRequestLocaleMock).toHaveBeenCalledWith("en");
  });

  it("passes the token from searchParams through to VerifyEmailClient", async () => {
    await renderPage({ token: "tok_abc123" });

    const client = screen.getByTestId("verify-email-client");
    expect(client).toHaveAttribute("data-token", "tok_abc123");
    expect(client).toHaveAttribute("data-has-token", "true");
  });

  it("mounts VerifyEmailClient with an undefined token when the query param is missing", async () => {
    await renderPage({});

    const client = screen.getByTestId("verify-email-client");
    expect(client).toHaveAttribute("data-has-token", "false");
  });

  it("wraps the client in AuthLayout with the SaaSmint app name and localized title", async () => {
    await renderPage({ token: "tok_123" });

    const layout = screen.getByTestId("auth-layout");
    expect(layout).toHaveAttribute("data-app", "SaaSmint");
    // The auth.verifyEmail translator returns "title" as-is under the echo stub.
    expect(layout).toHaveAttribute("data-title", "title");
  });

  describe("generateMetadata", () => {
    it("sets the document title from the auth.verifyEmail namespace", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      });

      // Echo stub returns the key; the page asks for "pageTitle".
      expect(metadata.title).toBe("pageTitle");
    });
  });
});
