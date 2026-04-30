import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";
import type { Subscription } from "@/domain/models/Subscription";

// --- Mocks ---------------------------------------------------------------

const setRequestLocaleMock = vi.fn();
// Echo the key when called without params; interpolate `{name}` placeholders
// when called with a params object so component tests can assert on the
// substituted value (e.g. orgName -> "Acme").
const mockTranslate = vi.fn(
  (key: string, params?: Record<string, string | number>) => {
    if (!params) return key;
    const tail = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    return tail ? `${key} ${tail}` : key;
  },
);
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => Promise.resolve(mockTranslate)),
  setRequestLocale: (locale: string) => setRequestLocaleMock(locale),
}));

const mockGetCurrentUser = vi.fn<() => Promise<User>>();
vi.mock("@/app/[locale]/(app)/_data/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockGetOrgMembers = vi.fn<() => Promise<unknown[]>>(() =>
  Promise.resolve([]),
);
vi.mock("@/app/[locale]/(app)/_data/getOrgMembers", () => ({
  getOrgMembers: () => mockGetOrgMembers(),
}));

const mockGetSubscriptions = vi.fn<() => Promise<Subscription[]>>(() =>
  Promise.resolve([]),
);
vi.mock("@/app/[locale]/(app)/_data/getSubscriptions", () => ({
  getSubscriptions: () => mockGetSubscriptions(),
}));

const mockGetCreditBalances = vi.fn<
  () => Promise<{ balance: number; scope: "user" | "org" }[]>
>(() => Promise.resolve([]));
vi.mock("@/app/[locale]/(app)/_data/getCreditBalances", () => ({
  getCreditBalances: () => mockGetCreditBalances(),
}));

const mockGetUserOrgs = vi.fn<() => Promise<unknown[]>>(() =>
  Promise.resolve([]),
);
vi.mock("@/app/[locale]/(app)/_data/getUserOrgs", () => ({
  getUserOrgs: () => mockGetUserOrgs(),
}));

const mockCanManageBilling = vi.fn<
  (
    user: unknown,
    sub: { plan: { context: "personal" | "team" } },
  ) => Promise<boolean>
>(() => Promise.resolve(false));
vi.mock("@/app/[locale]/(app)/subscription/_data/canManageBilling", () => ({
  canManageBilling: (user: unknown, sub: unknown) =>
    mockCanManageBilling(
      user,
      sub as { plan: { context: "personal" | "team" } },
    ),
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

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/ProductsCheckoutSection",
  async () => {
    const React = await import("react");
    return {
      ProductsCheckoutSection: (props: {
        showPicker: boolean;
        teamOptionLabel: string;
      }) =>
        React.createElement(
          "div",
          {
            "data-testid": "products-checkout-section",
            "data-show-picker": props.showPicker ? "true" : "false",
            "data-team-option-label": props.teamOptionLabel,
          },
          "products-checkout-section",
        ),
    };
  },
);

vi.mock("@/presentation/components/organisms/SubscriptionCard", async () => {
  const React = await import("react");
  return {
    SubscriptionCard: (props: { eyebrowLabel?: string; planName?: string }) =>
      React.createElement(
        "div",
        { "data-testid": "subscription-card" },
        React.createElement(
          "span",
          { "data-testid": "sub-card-eyebrow" },
          props.eyebrowLabel ?? "",
        ),
        React.createElement(
          "span",
          { "data-testid": "sub-card-plan-name" },
          props.planName ?? "",
        ),
      ),
  };
});

// CurrentSubscriptionCard is an async Server Component; React Testing Library
// cannot unwrap async children rendered through a parent tree, so swap it for
// a sync stub that exposes the props the page hands down.
vi.mock(
  "@/app/[locale]/(app)/subscription/_components/CurrentSubscriptionCard",
  async () => {
    const React = await import("react");
    return {
      CurrentSubscriptionCard: (props: {
        subscription: { id: string; plan: { context: "personal" | "team" } };
        planName: string;
        isConcurrent?: boolean;
      }) =>
        React.createElement(
          "div",
          {
            "data-testid": "subscription-card",
            "data-context": props.subscription.plan.context,
            "data-is-concurrent": props.isConcurrent ? "true" : "false",
          },
          React.createElement(
            "span",
            { "data-testid": "sub-card-plan-name" },
            props.planName,
          ),
        ),
    };
  },
);

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
    // getSubscriptions is mocked to resolve [] at the top of this file. The
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

  it("does not render a credit-balance card when getCreditBalances returns []", async () => {
    mockGetCreditBalances.mockResolvedValueOnce([]);
    await renderPage({});

    // The eyebrow label key only appears when at least one card renders.
    expect(screen.queryByText("creditBalanceLabel")).not.toBeInTheDocument();
  });

  it("renders the CreditBalanceCard above the upgrade options when a personal balance is returned", async () => {
    mockGetCreditBalances.mockResolvedValueOnce([
      { balance: 250, scope: "user" },
    ]);
    await renderPage({});

    expect(screen.getByText("creditBalanceLabel")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("creditBalancePersonalBadge")).toBeInTheDocument();
    expect(
      screen.getByText("creditBalancePersonalDescription"),
    ).toBeInTheDocument();
  });

  it("uses the org-scope wording when only an org balance is returned", async () => {
    mockGetCreditBalances.mockResolvedValueOnce([
      { balance: 9000, scope: "org" },
    ]);
    await renderPage({});

    expect(screen.getByText("9,000")).toBeInTheDocument();
    expect(screen.getByText("creditBalanceOrgBadge")).toBeInTheDocument();
    expect(screen.getByText("creditBalanceOrgDescription")).toBeInTheDocument();
  });

  it("renders one card per scope in the order the backend returned them", async () => {
    // Backend controls the order per its UX intent (rule 16 returns
    // [org, user] for upgraded ORG_MEMBERs); the page renders rows as-is.
    // Plain personal/org labels stay accurate regardless of why both rows
    // appear, so we don't second-guess scope semantics in the client.
    mockGetCreditBalances.mockResolvedValueOnce([
      { balance: 500, scope: "org" },
      { balance: 75, scope: "user" },
    ]);
    await renderPage({});

    const orgBadge = screen.getByText("creditBalanceOrgBadge");
    const personalBadge = screen.getByText("creditBalancePersonalBadge");
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    // Org card precedes personal card because that's the order the gateway
    // resolved into `creditBalances` (the page does not re-sort).
    expect(
      orgBadge.compareDocumentPosition(personalBadge) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  describe("product checkout context picker (rule 5b)", () => {
    function makeSub(id: string, context: "personal" | "team"): Subscription {
      return {
        id,
        status: "active",
        plan: {
          id: `${id}-plan`,
          name: "Pro",
          description: "",
          context,
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
      };
    }

    it("does NOT show the picker for a single-sub user (no concurrent billing)", async () => {
      mockGetSubscriptions.mockResolvedValueOnce([
        makeSub("sub_p", "personal"),
      ]);
      await renderPage({});

      const section = screen.getByTestId("products-checkout-section");
      expect(section).toHaveAttribute("data-show-picker", "false");
    });

    it("shows the picker only when the caller is the org owner with concurrent personal+team subs", async () => {
      mockGetSubscriptions.mockResolvedValueOnce([
        makeSub("sub_p", "personal"),
        makeSub("sub_t", "team"),
      ]);
      mockGetUserOrgs.mockResolvedValueOnce([
        { id: "org_1", name: "Acme", slug: "acme", logoUrl: null },
      ]);
      mockGetOrgMembers.mockResolvedValueOnce([
        {
          id: "m1",
          org: "org_1",
          user: {
            id: "u1",
            email: "u1@e.co",
            fullName: "User One",
            avatarUrl: null,
          },
          role: "owner",
          isBilling: true,
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ]);

      await renderPage({});

      const section = screen.getByTestId("products-checkout-section");
      expect(section).toHaveAttribute("data-show-picker", "true");
      // Org name is interpolated into the team-option label.
      expect(section).toHaveAttribute(
        "data-team-option-label",
        expect.stringContaining("Acme") as unknown as string,
      );
    });

    it("does NOT show the picker for an org admin/member even with concurrent subs", async () => {
      // Admins and regular members can buy credits, but only the owner can
      // direct the charge to either Stripe customer — backend would 403 on a
      // ?context=team request from a non-owner.
      mockGetSubscriptions.mockResolvedValueOnce([
        makeSub("sub_p", "personal"),
        makeSub("sub_t", "team"),
      ]);
      mockGetUserOrgs.mockResolvedValueOnce([
        { id: "org_1", name: "Acme", slug: "acme", logoUrl: null },
      ]);
      mockGetOrgMembers.mockResolvedValueOnce([
        {
          id: "m1",
          org: "org_1",
          user: {
            id: "u1",
            email: "u1@e.co",
            fullName: "User One",
            avatarUrl: null,
          },
          role: "admin",
          isBilling: false,
          joinedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "m2",
          org: "org_1",
          user: {
            id: "owner",
            email: "o@e.co",
            fullName: "Owner",
            avatarUrl: null,
          },
          role: "owner",
          isBilling: true,
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ]);

      await renderPage({});

      const section = screen.getByTestId("products-checkout-section");
      expect(section).toHaveAttribute("data-show-picker", "false");
    });
  });

  describe("concurrent personal+team rendering (rule 5)", () => {
    function makeSub(
      id: string,
      context: "personal" | "team",
      tier: 2 | 3 = 3,
    ): Subscription {
      return {
        id,
        status: "active",
        plan: {
          id: `${id}-plan`,
          name: "Pro",
          description: "",
          context,
          tier,
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
      };
    }

    it("renders two CurrentSubscriptionCards in personal-first order with isConcurrent=true", async () => {
      // Backend may return them in any order — verify the page sorts personal
      // before team (via getSubscriptionPageData -> findPersonal/findTeam).
      mockGetSubscriptions.mockResolvedValueOnce([
        makeSub("sub_team", "team"),
        makeSub("sub_personal", "personal"),
      ]);

      await renderPage({});

      const cards = screen.getAllByTestId("subscription-card");
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveAttribute("data-context", "personal");
      expect(cards[1]).toHaveAttribute("data-context", "team");
      expect(cards[0]).toHaveAttribute("data-is-concurrent", "true");
      expect(cards[1]).toHaveAttribute("data-is-concurrent", "true");

      // FreePlanCard is suppressed when there are subs to render.
      expect(
        screen.queryByText("personal.1.description"),
      ).not.toBeInTheDocument();
    });

    it("renders a single card with isConcurrent=false when only one sub exists", async () => {
      mockGetSubscriptions.mockResolvedValueOnce([
        makeSub("sub_personal", "personal"),
      ]);

      await renderPage({});

      const cards = screen.getAllByTestId("subscription-card");
      expect(cards).toHaveLength(1);
      expect(cards[0]).toHaveAttribute("data-context", "personal");
      expect(cards[0]).toHaveAttribute("data-is-concurrent", "false");
    });
  });

  describe("teamPlanReadonly notice (org members on a team-only sub they can't manage)", () => {
    function makeSub(id: string, context: "personal" | "team"): Subscription {
      return {
        id,
        status: "active",
        plan: {
          id: `${id}-plan`,
          name: "Pro",
          description: "",
          context,
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
      };
    }

    it("renders the teamPlanReadonly notice when the only sub is team and the caller can't manage it", async () => {
      // Org member viewing the page: team sub exists, they can't manage it,
      // and they have no personal sub of their own. Plan options are
      // suppressed — the team owner controls billing.
      mockGetSubscriptions.mockResolvedValueOnce([makeSub("sub_t", "team")]);
      mockCanManageBilling.mockResolvedValue(false);

      await renderPage({});

      expect(screen.getByText("teamPlanReadonly")).toBeInTheDocument();
    });

    it("does NOT render the teamPlanReadonly notice when the caller has a personal sub alongside an unmanageable team sub", async () => {
      // Concurrent personal+team — even if the team sub is owner-managed
      // (caller can't), the caller can still upgrade/downgrade their own
      // personal plan, so plan options must remain visible.
      mockGetSubscriptions.mockResolvedValueOnce([
        makeSub("sub_p", "personal"),
        makeSub("sub_t", "team"),
      ]);
      mockCanManageBilling.mockImplementation(
        async (_user, sub) => sub.plan.context === "personal",
      );

      await renderPage({});

      expect(screen.queryByText("teamPlanReadonly")).not.toBeInTheDocument();
    });

    it("does NOT render the teamPlanReadonly notice when the caller CAN manage the team sub", async () => {
      mockGetSubscriptions.mockResolvedValueOnce([makeSub("sub_t", "team")]);
      mockCanManageBilling.mockResolvedValue(true);

      await renderPage({});

      expect(screen.queryByText("teamPlanReadonly")).not.toBeInTheDocument();
    });

    it("does NOT render the teamPlanReadonly notice when the only sub is personal", async () => {
      mockGetSubscriptions.mockResolvedValueOnce([
        makeSub("sub_p", "personal"),
      ]);
      mockCanManageBilling.mockResolvedValue(false);

      await renderPage({});

      expect(screen.queryByText("teamPlanReadonly")).not.toBeInTheDocument();
    });
  });
});
