import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Invitation } from "@/domain/models/Invitation";

// --- Mocks ---------------------------------------------------------------

const setRequestLocaleMock = vi.fn();
const mockTranslate = vi.fn((key: string, params?: Record<string, unknown>) =>
  params ? `${key} ${Object.values(params).join(" ")}` : key,
);
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => Promise.resolve(mockTranslate)),
  setRequestLocale: (locale: string) => setRequestLocaleMock(locale),
}));

const mockGetByToken = vi.fn<(token: string) => Promise<Invitation>>();
vi.mock("@/infrastructure/registry", () => ({
  invitationGateway: { getByToken: (t: string) => mockGetByToken(t) },
}));

vi.mock("@/app/actions/invitation", () => ({
  declineInvitation: vi.fn(),
}));

// The AcceptInvitationForm is a client component with its own test; stub it
// so we only assert that the page wires the right token through.
vi.mock(
  "@/app/[locale]/(public)/invitations/[token]/_components/AcceptInvitationForm",
  () => ({
    AcceptInvitationForm: ({ token }: { token: string }) =>
      React.createElement("div", {
        "data-testid": "accept-invitation-form",
        "data-token": token,
      }),
  }),
);

// --- Import under test (after mocks) -------------------------------------

const pageModule =
  await import("@/app/[locale]/(public)/invitations/[token]/page");
const InvitationPage = pageModule.default;
const { generateMetadata } = pageModule;

// --- Helpers -------------------------------------------------------------

function makeInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: "inv_1",
    org: "org_1",
    orgName: "Acme Corp",
    email: "invitee@example.com",
    role: "member",
    status: "pending",
    invitedBy: {
      id: "u_admin",
      email: "admin@acme.test",
      fullName: "Admin One",
    },
    createdAt: "2025-01-01T00:00:00Z",
    expiresAt: "2025-01-08T00:00:00Z",
    ...overrides,
  };
}

async function renderPage(token: string) {
  const jsx = await InvitationPage({
    params: Promise.resolve({ locale: "en", token }),
  });
  return render(jsx as React.ReactElement);
}

// --- Tests ---------------------------------------------------------------

describe("InvitationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByToken.mockResolvedValue(makeInvitation());
  });

  it("fetches the invitation by its token and forwards the token to the accept form", async () => {
    await renderPage("tok_abc123");

    expect(mockGetByToken).toHaveBeenCalledWith("tok_abc123");
    const form = screen.getByTestId("accept-invitation-form");
    expect(form).toHaveAttribute("data-token", "tok_abc123");
  });

  it("calls setRequestLocale with the locale from params", async () => {
    await renderPage("tok_abc123");
    expect(setRequestLocaleMock).toHaveBeenCalledWith("en");
  });

  it("renders the invitation title heading", async () => {
    await renderPage("tok_abc123");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "title",
    );
  });

  it("interpolates the invitation orgName into the description", async () => {
    mockGetByToken.mockResolvedValue(makeInvitation({ orgName: "Globex Inc" }));

    await renderPage("tok_abc123");

    // Translator stub echoes params; an orgName appears wherever the description
    // is rendered.
    expect(screen.getByText(/Globex Inc/)).toBeInTheDocument();
  });

  it("renders the decline form with the token as a hidden input", async () => {
    const { container } = await renderPage("tok_abc123");

    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="token"]',
    );
    expect(hidden).not.toBeNull();
    expect(hidden!.value).toBe("tok_abc123");

    // The decline button uses the i18n "decline" key.
    expect(screen.getByRole("button", { name: "decline" })).toBeInTheDocument();
  });

  it("propagates gateway errors instead of swallowing them (invalid token, expired, etc.)", async () => {
    mockGetByToken.mockRejectedValue(new Error("Not found"));

    await expect(renderPage("bad_token")).rejects.toThrow("Not found");
  });

  describe("generateMetadata", () => {
    it("returns robots noindex+nofollow and no-referrer for the invitation page", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale: "en", token: "tok_abc123" }),
      });

      expect(metadata.robots).toEqual({ index: false, follow: false });
      expect(metadata.referrer).toBe("no-referrer");
      expect(metadata.title).toBe("title");
    });
  });
});
