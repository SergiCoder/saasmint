import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";

// --- Mocks ---------------------------------------------------------------

const setRequestLocaleMock = vi.fn();
const mockTranslate = vi.fn((key: string) => key);
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => Promise.resolve(mockTranslate)),
  setRequestLocale: (locale: string) => setRequestLocaleMock(locale),
}));

const mockGetCurrentUser = vi.fn<() => Promise<User>>();
vi.mock("@/app/[locale]/(app)/_data/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/app/[locale]/(app)/_data/getOrgMembers", () => ({
  getOrgMembers: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/app/[locale]/(app)/_data/getSubscription", () => ({
  getSubscription: vi.fn(() => Promise.resolve(null)),
}));

const mockGetCreditBalance =
  vi.fn<() => Promise<{ balance: number; scope: "user" | "org" } | null>>(
    () => Promise.resolve(null),
  );
vi.mock("@/app/[locale]/(app)/_data/getCreditBalance", () => ({
  getCreditBalance: () => mockGetCreditBalance(),
}));

vi.mock("@/app/[locale]/(app)/_data/getUserOrgs", () => ({
  getUserOrgs: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/app/[locale]/(app)/subscription/_data/canManageBilling", () => ({
  canManageBilling: vi.fn(() => Promise.resolve(false)),
}));

// Use-case stubs — return empty lists so we don't render the pricing table.
// Gateway stubs — return empty lists so we don't render the pricing table.
vi.mock("@/infrastructure/registry", () => ({
  planGateway: { listPlans: () => Promise.resolve([]) },
  productGateway: { listProducts: () => Promise.resolve([]) },
}));

// Stub presentation organisms/molecules that would otherwise pull in a full
// pricing tree.
vi.mock("@/presentation/components/organisms/PricingSection", async () => {
  const React = await import("react");
  return {
    PricingSection: () => React.createElement("div", null, "pricing-section"),
  };
});

vi.mock("@/presentation/components/organisms/ProductsGrid", async () => {
  const React = await import("react");
  return {
    ProductsGrid: () => React.createElement("div", null, "products-grid"),
  };
});

vi.mock("@/presentation/components/organisms/SubscriptionCard", async () => {
  const React = await import("react");
  return {
    SubscriptionCard: () =>
      React.createElement("div", null, "subscription-card"),
  };
});

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/CheckoutButton",
  async () => {
    const React = await import("react");
    return {
      CheckoutButton: ({ children }: { children: React.ReactNode }) =>
        React.createElement("button", { type: "button" }, children),
    };
  },
);

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/TeamCheckoutButton",
  async () => {
    const React = await import("react");
    return {
      TeamCheckoutButton: ({ children }: { children: React.ReactNode }) =>
        React.createElement("button", { type: "button" }, children),
    };
  },
);

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/BillingPortalButton",
  async () => {
    const React = await import("react");
    return {
      BillingPortalButton: ({ children }: { children: React.ReactNode }) =>
        React.createElement("button", { type: "button" }, children),
    };
  },
);

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/CancelRenewalButton",
  async () => {
    const React = await import("react");
    return {
      CancelRenewalButton: () =>
        React.createElement("button", { type: "button" }, "cancel"),
    };
  },
);

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/ResumeSubscriptionButton",
  async () => {
    const React = await import("react");
    return {
      ResumeSubscriptionButton: () =>
        React.createElement("button", { type: "button" }, "resume"),
    };
  },
);

// --- Import under test (after mocks) -------------------------------------

const { default: BillingPage } =
  await import("@/app/[locale]/(app)/subscription/page");

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
    ...overrides,
  };
}

async function renderPage(searchParams: { status?: string; error?: string }) {
  const jsx = await BillingPage({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(jsx as React.ReactElement);
}

// --- Tests ----------------------------------------------------------------

describe("BillingPage (subscription/page)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(makeUser());
  });

  it("calls setRequestLocale with the locale from params", async () => {
    await renderPage({});

    expect(setRequestLocaleMock).toHaveBeenCalledWith("en");
  });

  it("renders the checkoutError AlertBanner when searchParams.error is 'checkout_failed'", async () => {
    await renderPage({ error: "checkout_failed" });

    // Translations map key -> key in the mock, so we look for the key literal.
    expect(screen.getByText("checkoutError")).toBeInTheDocument();
  });

  it("does not render the checkoutError banner when error is missing", async () => {
    await renderPage({});

    expect(screen.queryByText("checkoutError")).not.toBeInTheDocument();
  });

  it("does not render the checkoutError banner for unrelated error values", async () => {
    await renderPage({ error: "something_else" });

    expect(screen.queryByText("checkoutError")).not.toBeInTheDocument();
  });

  it("renders the FreePlanCard when the user has no active subscription", async () => {
    // getSubscription is mocked to resolve null at the top of this file. The
    // page falls back to FreePlanCard, which pulls the personal-free plan
    // name + description from the `plans` next-intl namespace.
    await renderPage({});

    // The mocked translator echoes the key back, so both the heading and
    // the badge surface as the literal "personal.1.name".
    const namedNodes = screen.getAllByText("personal.1.name");
    expect(namedNodes.length).toBeGreaterThanOrEqual(2); // heading + badge
    expect(screen.getByText("personal.1.description")).toBeInTheDocument();
    expect(screen.getByText("currentPlan")).toBeInTheDocument();
  });

  it("does not render a credit-balance card when getCreditBalance returns null", async () => {
    mockGetCreditBalance.mockResolvedValueOnce(null);
    await renderPage({});

    // The eyebrow label key only appears when the card renders.
    expect(screen.queryByText("creditBalanceLabel")).not.toBeInTheDocument();
  });

  it("renders the CreditBalanceCard above the upgrade options when a balance is returned", async () => {
    mockGetCreditBalance.mockResolvedValueOnce({ balance: 250, scope: "user" });
    await renderPage({});

    expect(screen.getByText("creditBalanceLabel")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("creditBalancePersonalBadge")).toBeInTheDocument();
    expect(
      screen.getByText("creditBalancePersonalDescription"),
    ).toBeInTheDocument();
  });

  it("uses the org-scope wording when the balance scope is 'org'", async () => {
    mockGetCreditBalance.mockResolvedValueOnce({ balance: 9000, scope: "org" });
    await renderPage({});

    expect(screen.getByText("9,000")).toBeInTheDocument();
    expect(screen.getByText("creditBalanceOrgBadge")).toBeInTheDocument();
    expect(screen.getByText("creditBalanceOrgDescription")).toBeInTheDocument();
  });
});
