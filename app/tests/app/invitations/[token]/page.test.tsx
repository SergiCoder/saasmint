import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Invitation } from "@/domain/models/Invitation";
import type { Subscription } from "@/domain/models/Subscription";
import { AuthError } from "@/domain/errors/AuthError";

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
const mockListSubscriptions =
  vi.fn<(currency?: string) => Promise<Subscription[]>>();
vi.mock("@/infrastructure/registry", () => ({
  invitationGateway: { getByToken: (t: string) => mockGetByToken(t) },
  subscriptionGateway: {
    listSubscriptions: (currency?: string) => mockListSubscriptions(currency),
  },
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

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub_1",
    status: "active",
    plan: {
      id: "plan_1",
      name: "Pro",
      description: "",
      context: "personal",
      tier: 3,
      interval: "month",
      price: null,
    },
    quantity: 1,
    trialEndsAt: null,
    currentPeriodStart: "2026-01-01T00:00:00Z",
    currentPeriodEnd: "2026-02-01T00:00:00Z",
    cancelAt: null,
    canceledAt: null,
    createdAt: "2026-01-01T00:00:00Z",
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
    // Default: anonymous visitor — gateway throws AuthError → page coerces
    // to null. Use the real domain class so the page's `instanceof AuthError`
    // narrowing actually fires (a generic Error would re-throw).
    mockListSubscriptions.mockRejectedValue(
      new AuthError("No active session", "NO_SESSION"),
    );
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

  describe("concurrent-billing notice", () => {
    it("does not render the notice for anonymous visitors (no active session)", async () => {
      // beforeEach already configures mockListSubscriptions to reject.
      await renderPage("tok_abc123");

      expect(
        screen.queryByText(/concurrentSubscriptionNotice/),
      ).not.toBeInTheDocument();
    });

    it("renders the concurrent-billing notice when an authed visitor has an active personal sub", async () => {
      mockListSubscriptions.mockResolvedValue([makeSub()]);

      await renderPage("tok_abc123");

      expect(
        screen.getByText(/concurrentSubscriptionNotice/),
      ).toBeInTheDocument();
    });

    it("does not render the notice when an authed free-tier visitor has no subscription (gateway resolves null)", async () => {
      // Distinct from the anonymous AuthError-rejected case: an authed user
      // on the free tier hits the gateway successfully and gets an empty
      // list back (backend's empty `results` replaces the prior 404). No
      // concurrent billing risk, so no notice.
      mockListSubscriptions.mockResolvedValue([]);

      await renderPage("tok_abc123");

      expect(
        screen.queryByText(/concurrentSubscriptionNotice/),
      ).not.toBeInTheDocument();
    });

    it("does not render the notice when the authed visitor has a team sub (only personal subs trigger dual billing on accept)", async () => {
      mockListSubscriptions.mockResolvedValue([
        makeSub({
          plan: {
            id: "plan_team",
            name: "Team Pro",
            description: "",
            context: "team",
            tier: 3,
            interval: "month",
            price: null,
          },
        }),
      ]);

      await renderPage("tok_abc123");

      expect(
        screen.queryByText(/concurrentSubscriptionNotice/),
      ).not.toBeInTheDocument();
    });
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
