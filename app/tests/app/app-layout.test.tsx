import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";
import type { Org } from "@/domain/models/Org";
import type { Subscription } from "@/domain/models/Subscription";

// --- Mocks ---------------------------------------------------------------

const setRequestLocaleMock = vi.fn();
const mockTranslate = vi.fn((key: string) => key);
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => Promise.resolve(mockTranslate)),
  setRequestLocale: (locale: string) => setRequestLocaleMock(locale),
}));

const redirectMock = vi.fn((args: { href: string; locale: string }) => {
  const err = new Error("NEXT_REDIRECT");
  (err as Error & { args: typeof args }).args = args;
  throw err;
});
vi.mock("@/lib/i18n/navigation", async () => {
  const React = await import("react");
  return {
    Link: ({
      href,
      children,
      ...rest
    }: {
      href: string;
      children: React.ReactNode;
    }) => React.createElement("a", { href, ...rest }, children),
    redirect: (args: { href: string; locale: string }) => redirectMock(args),
  };
});

const mockGetPathnameWithoutLocale = vi.fn(async () => "/dashboard");
vi.mock("@/lib/pathname", () => ({
  getPathnameWithoutLocale: () => mockGetPathnameWithoutLocale(),
}));

const mockGetCurrentUser = vi.fn<() => Promise<User>>();
vi.mock("@/app/[locale]/(app)/_data/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockGetSubscription = vi.fn<() => Promise<Subscription | null>>();
vi.mock("@/app/[locale]/(app)/_data/getSubscription", () => ({
  getSubscription: () => mockGetSubscription(),
}));

const mockGetUserOrgs = vi.fn<(userId: string) => Promise<Org[]>>();
vi.mock("@/app/[locale]/(app)/_data/getUserOrgs", () => ({
  getUserOrgs: (userId: string) => mockGetUserOrgs(userId),
}));

// Stub AppLayout template so we can inspect the navLinks/userMenuItems the
// route layout builds, without rendering the full NavBar.
vi.mock("@/presentation/components/templates/AppLayout", async () => {
  const React = await import("react");
  return {
    AppLayout: ({
      navLinks,
      userMenuItems,
      children,
    }: {
      navLinks: { href: string; label: string }[];
      userMenuItems?: { href: string; label: string }[];
      children: React.ReactNode;
    }) =>
      React.createElement(
        "div",
        { "data-testid": "app-layout" },
        React.createElement(
          "ul",
          { "data-testid": "nav-links" },
          navLinks.map((l) =>
            React.createElement(
              "li",
              { key: l.href, "data-href": l.href },
              l.label,
            ),
          ),
        ),
        React.createElement(
          "ul",
          { "data-testid": "menu-items" },
          (userMenuItems ?? []).map((l) =>
            React.createElement(
              "li",
              { key: l.href, "data-href": l.href },
              l.label,
            ),
          ),
        ),
        children,
      ),
  };
});

vi.mock("@/app/[locale]/(app)/_components/SignOutButton", async () => {
  const React = await import("react");
  return {
    SignOutButton: ({ label }: { label: string }) =>
      React.createElement("button", { type: "button" }, label),
  };
});

// --- Import under test (after mocks) -------------------------------------

const { default: AppLayoutRoute } = await import("@/app/[locale]/(app)/layout");

// --- Helpers --------------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "test@example.com",
    fullName: "Test User",
    avatarUrl: null,
    accountType: "personal",
    preferredLocale: "en",
    preferredCurrency: "usd",
    phonePrefix: null,
    phone: null,
    timezone: null,
    jobTitle: null,
    pronouns: null,
    bio: null,
    isVerified: true,
    createdAt: "2025-01-01T00:00:00Z",
    registrationMethod: "email",
    linkedProviders: [],
    updatedAt: "2025-01-01T00:00:00Z",
    scheduledDeletionAt: null,
    ...overrides,
  };
}

function makeOrg(overrides: Partial<Org> = {}): Org {
  return {
    id: "org-1",
    name: "Acme Corp",
    slug: "acme",
    logoUrl: null,
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTeamSubscription(): Subscription {
  return {
    id: "sub_1",
    status: "active",
    plan: {
      id: "plan_team_pro",
      name: "Team Pro",
      description: "",
      context: "team",
      tier: 3,
      interval: "month",
      price: {
        id: "price_1",
        amount: 5000,
        displayAmount: 50,
        currency: "usd",
      },
    },
    quantity: 3,
    currentPeriodStart: "2025-01-01T00:00:00Z",
    currentPeriodEnd: "2025-02-01T00:00:00Z",
    trialEndsAt: null,
    canceledAt: null,
    createdAt: "2025-01-01T00:00:00Z",
  };
}

async function renderLayout(locale: string) {
  const jsx = await AppLayoutRoute({
    children: "app-body",
    params: Promise.resolve({ locale }),
  });
  return render(jsx as React.ReactElement);
}

// --- Tests ----------------------------------------------------------------

describe("(app)/layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(makeUser());
    mockGetSubscription.mockResolvedValue(null);
    mockGetUserOrgs.mockResolvedValue([]);
    mockGetPathnameWithoutLocale.mockResolvedValue("/dashboard");
  });

  it("calls setRequestLocale with the locale from params", async () => {
    await renderLayout("en");

    expect(setRequestLocaleMock).toHaveBeenCalledWith("en");
  });

  it("renders base nav links without org when the user has no orgs and no team sub", async () => {
    await renderLayout("en");

    const hrefs = Array.from(
      screen.getByTestId("nav-links").querySelectorAll("li"),
    ).map((li) => li.getAttribute("data-href"));

    expect(hrefs).toEqual(["/dashboard", "/feature1", "/feature2"]);
  });

  it("adds /org nav link when the user has a team subscription", async () => {
    mockGetSubscription.mockResolvedValue(makeTeamSubscription());

    await renderLayout("en");

    const hrefs = Array.from(
      screen.getByTestId("nav-links").querySelectorAll("li"),
    ).map((li) => li.getAttribute("data-href"));

    expect(hrefs).toContain("/org");
  });

  it("adds /org nav link when the user belongs to any org (no team sub)", async () => {
    mockGetUserOrgs.mockResolvedValue([makeOrg()]);

    await renderLayout("en");

    const hrefs = Array.from(
      screen.getByTestId("nav-links").querySelectorAll("li"),
    ).map((li) => li.getAttribute("data-href"));

    expect(hrefs).toContain("/org");
  });

  it("redirects to preferredLocale when it differs from the URL locale", async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser({ preferredLocale: "es" }));
    mockGetPathnameWithoutLocale.mockResolvedValue("/profile");

    await expect(renderLayout("en")).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith({
      href: "/profile",
      locale: "es",
    });
    // Must not continue to fetch sub/orgs after deciding to redirect.
    expect(mockGetSubscription).not.toHaveBeenCalled();
    expect(mockGetUserOrgs).not.toHaveBeenCalled();
  });

  it("does not redirect when preferredLocale matches the URL locale", async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser({ preferredLocale: "en" }));

    await renderLayout("en");

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not redirect when the user has no preferredLocale", async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser({ preferredLocale: "" }));

    await renderLayout("en");

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not redirect when preferredLocale is unsupported", async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser({ preferredLocale: "xx" }));

    await renderLayout("en");

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
