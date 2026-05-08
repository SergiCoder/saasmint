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

// Gateway stubs — return empty lists by default; tests that need to render
// the pricing grid can override `mockListPlans` per-case.
const mockListPlans = vi.fn<(currency?: string) => Promise<unknown[]>>(() =>
  Promise.resolve([]),
);
const mockListProducts = vi.fn<(currency?: string) => Promise<unknown[]>>(() =>
  Promise.resolve([]),
);
vi.mock("@/infrastructure/registry", () => ({
  planGateway: { listPlans: (c?: string) => mockListPlans(c) },
  productGateway: { listProducts: (c?: string) => mockListProducts(c) },
}));

// Stub presentation organisms/molecules that would otherwise pull in a full
// pricing tree.
vi.mock("@/presentation/components/organisms/PricingSection", async () => {
  const React = await import("react");
  return {
    PricingSection: (props: {
      title: string;
      groups: {
        key: string;
        monthly?: { cta: React.ReactNode | null };
        yearly?: { cta: React.ReactNode | null };
      }[];
    }) =>
      React.createElement(
        "div",
        { "data-testid": `pricing-section-${props.title}` },
        props.groups.map((g) =>
          React.createElement(
            "div",
            { key: g.key, "data-testid": `plan-${g.key}` },
            React.createElement(
              "div",
              { "data-testid": `plan-${g.key}-monthly` },
              g.monthly?.cta ?? null,
            ),
            React.createElement(
              "div",
              { "data-testid": `plan-${g.key}-yearly` },
              g.yearly?.cta ?? null,
            ),
          ),
        ),
      ),
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
        priceSubLabels?: Record<string, string>;
      }) =>
        React.createElement(
          "div",
          {
            "data-testid": "products-checkout-section",
            "data-show-picker": props.showPicker ? "true" : "false",
            "data-team-option-label": props.teamOptionLabel,
            "data-has-price-sub-labels": props.priceSubLabels
              ? Object.keys(props.priceSubLabels).join(",")
              : "",
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
        React.createElement(
          "button",
          { type: "button", "data-cta": "checkout" },
          children,
        ),
    };
  },
);

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/TeamCheckoutButton",
  async () => {
    const React = await import("react");
    return {
      TeamCheckoutButton: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          "button",
          { type: "button", "data-cta": "team-checkout" },
          children,
        ),
    };
  },
);

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/BillingPortalButton",
  async () => {
    const React = await import("react");
    return {
      BillingPortalButton: ({
        children,
        context,
      }: {
        children: React.ReactNode;
        context?: "personal" | "team";
      }) =>
        React.createElement(
          "button",
          {
            type: "button",
            "data-cta": "portal",
            "data-context": context ?? "",
          },
          children,
        ),
    };
  },
);

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/ChangePlanButton",
  async () => {
    const React = await import("react");
    return {
      ChangePlanButton: ({
        children,
        context,
        isDeferred,
      }: {
        children: React.ReactNode;
        context?: "personal" | "team";
        isDeferred?: boolean;
      }) =>
        React.createElement(
          "button",
          {
            type: "button",
            "data-cta": "change-plan",
            "data-context": context ?? "",
            "data-deferred": isDeferred ? "true" : "false",
          },
          children,
        ),
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
  "@/app/[locale]/(app)/subscription/_components/BillingActionButton",
  async () => {
    const React = await import("react");
    return {
      BillingActionButton: ({ children }: { children: React.ReactNode }) =>
        React.createElement("button", { type: "button" }, children),
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
        seatLimit: 1,
        seatsUsed: 1,
        trialEndsAt: null,
        currentPeriodStart: "2026-01-01T00:00:00Z",
        currentPeriodEnd: "2026-02-01T00:00:00Z",
        cancelAt: null,
        canceledAt: null,
        scheduledPlan: null,
        scheduledChangeAt: null,
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
        seatLimit: 1,
        seatsUsed: 1,
        trialEndsAt: null,
        currentPeriodStart: "2026-01-01T00:00:00Z",
        currentPeriodEnd: "2026-02-01T00:00:00Z",
        cancelAt: null,
        canceledAt: null,
        scheduledPlan: null,
        scheduledChangeAt: null,
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

  describe("upgrade CTA routing", () => {
    // Two-context subscriber on basic in both. Targeted at the bug where the
    // team-pro upgrade CTA was being suppressed by an `if (hasOrg) return null`
    // guard that conflated "starting a new team checkout" with "upgrading an
    // existing team subscription". The portal is the canonical Stripe path
    // for plan changes on an existing subscription.

    function makeSub(
      id: string,
      context: "personal" | "team",
      tier: 2 | 3,
    ): Subscription {
      return {
        id,
        status: "active",
        plan: {
          id: `${id}-plan`,
          name: tier === 2 ? "Basic" : "Pro",
          description: "",
          context,
          tier,
          interval: "month",
          price: {
            id: `${id}-price`,
            // Cheap basic; expensive pro. Monthly-equivalent comparison drives
            // `isUpgrade` in buildPlanCards.
            amount: tier === 2 ? 1000 : 3000,
            displayAmount: tier === 2 ? 10 : 30,
            currency: "usd",
            localDisplayAmount: null,
            localCurrency: null,
          },
        },
        seatLimit: 1,
        seatsUsed: 1,
        trialEndsAt: null,
        currentPeriodStart: "2026-01-01T00:00:00Z",
        currentPeriodEnd: "2026-02-01T00:00:00Z",
        cancelAt: null,
        canceledAt: null,
        scheduledPlan: null,
        scheduledChangeAt: null,
        createdAt: "2026-01-01T00:00:00Z",
      };
    }

    function makePlan(
      id: string,
      context: "personal" | "team",
      tier: 2 | 3,
    ): unknown {
      return {
        id,
        name: tier === 2 ? "Basic" : "Pro",
        description: "",
        context,
        tier,
        interval: "month",
        price: {
          id: `${id}-price`,
          amount: tier === 2 ? 1000 : 3000,
          displayAmount: tier === 2 ? 10 : 30,
          currency: "usd",
          localDisplayAmount: null,
          localCurrency: null,
        },
      };
    }

    it("renders a change-plan CTA on the team-pro card for an existing team-basic subscriber (regression: button was missing)", async () => {
      mockGetSubscriptions.mockResolvedValueOnce([
        makeSub("sub_p", "personal", 2),
        makeSub("sub_t", "team", 2),
      ]);
      mockCanManageBilling.mockResolvedValue(true);
      mockListPlans.mockResolvedValueOnce([
        makePlan("plan_p_basic", "personal", 2),
        makePlan("plan_p_pro", "personal", 3),
        makePlan("plan_t_basic", "team", 2),
        makePlan("plan_t_pro", "team", 3),
      ]);

      await renderPage({});

      // Team-pro card: actionable upgrade CTA wired to the in-app
      // change-plan dialog with `context=team`. Backend rule 8 would 409 a
      // fresh team checkout here; PATCH /subscriptions/me/ is the only
      // legal change-plan route.
      const teamProCta = screen
        .getByTestId("plan-team-3-monthly")
        .querySelector("[data-cta]") as HTMLElement | null;
      expect(teamProCta).not.toBeNull();
      expect(teamProCta?.getAttribute("data-cta")).toBe("change-plan");
      expect(teamProCta?.getAttribute("data-context")).toBe("team");

      // Personal-pro card stays on the same in-app change-plan route —
      // backend prorates upgrades in place; a fresh personal Checkout would
      // create a parallel sub.
      const personalProCta = screen
        .getByTestId("plan-personal-3-monthly")
        .querySelector("[data-cta]") as HTMLElement | null;
      expect(personalProCta?.getAttribute("data-cta")).toBe("change-plan");
      expect(personalProCta?.getAttribute("data-context")).toBe("personal");
    });

    it("hides the upgrade CTA on a higher-tier team card when the caller cannot manage the team sub", async () => {
      // Non-billing org member with a personal sub of their own. They can
      // upgrade their own personal plan, but the team upgrade is the
      // billing member's call — the team-pro CTA must be hidden.
      mockGetSubscriptions.mockResolvedValueOnce([
        makeSub("sub_p", "personal", 2),
        makeSub("sub_t", "team", 2),
      ]);
      mockCanManageBilling.mockImplementation(
        async (_user, sub) => sub.plan.context === "personal",
      );
      mockListPlans.mockResolvedValueOnce([
        makePlan("plan_t_basic", "team", 2),
        makePlan("plan_t_pro", "team", 3),
      ]);

      await renderPage({});

      const teamProSlot = screen.getByTestId("plan-team-3-monthly");
      expect(teamProSlot.querySelector("[data-cta]")).toBeNull();
    });

    it("keeps the first-time team checkout CTA when the user has no team sub and no org", async () => {
      // No team sub, no org membership: legitimate fresh team checkout.
      mockGetSubscriptions.mockResolvedValueOnce([]);
      mockGetUserOrgs.mockResolvedValueOnce([]);
      mockListPlans.mockResolvedValueOnce([
        makePlan("plan_t_basic", "team", 2),
        makePlan("plan_t_pro", "team", 3),
      ]);

      await renderPage({});

      const teamProCta = screen
        .getByTestId("plan-team-3-monthly")
        .querySelector("[data-cta]") as HTMLElement | null;
      expect(teamProCta?.getAttribute("data-cta")).toBe("team-checkout");
    });

    it("suppresses team CTAs for an org owner with no team sub (rule 8 would 409)", async () => {
      // Edge case: user owns an org but doesn't have a team subscription on
      // it (e.g. a former team sub that was cancelled). Posting a fresh
      // team Checkout would 409 with org_already_owned, so the CTA stays
      // hidden until the user resolves the conflict out of band.
      mockGetSubscriptions.mockResolvedValueOnce([]);
      mockGetUserOrgs.mockResolvedValueOnce([
        { id: "org_1", name: "Acme", slug: "acme", logoUrl: null },
      ]);
      mockListPlans.mockResolvedValueOnce([
        makePlan("plan_t_basic", "team", 2),
        makePlan("plan_t_pro", "team", 3),
      ]);

      await renderPage({});

      const teamProSlot = screen.getByTestId("plan-team-3-monthly");
      expect(teamProSlot.querySelector("[data-cta]")).toBeNull();
    });
  });

  describe("product priceSubLabels forwarding", () => {
    // When the backend returns a product whose billed currency differs from
    // the user's preferred locale currency, buildProductPriceSubLabels emits
    // a disclosure string and the page must forward it to
    // ProductsCheckoutSection so the dual-currency label reaches the card.

    it("forwards a non-empty priceSubLabels map when a product has a different local currency", async () => {
      mockListProducts.mockResolvedValueOnce([
        {
          id: "prod_chf",
          name: "200 Credits",
          type: "one_time",
          credits: 200,
          price: {
            id: "pp_chf",
            amount: 1999,
            displayAmount: 19.99,
            currency: "usd",
            // localCurrency differs from billed currency → sub-label emitted
            localDisplayAmount: 18.45,
            localCurrency: "chf",
          },
        },
      ]);

      await renderPage({});

      const section = screen.getByTestId("products-checkout-section");
      // The mock captures priceSubLabels keys as a comma-joined string.
      expect(section.getAttribute("data-has-price-sub-labels")).toBe(
        "prod_chf",
      );
    });

    it("forwards an empty priceSubLabels map when products have matching currencies", async () => {
      mockListProducts.mockResolvedValueOnce([
        {
          id: "prod_usd",
          name: "100 Credits",
          type: "one_time",
          credits: 100,
          price: {
            id: "pp_usd",
            amount: 999,
            displayAmount: 9.99,
            currency: "usd",
            localDisplayAmount: 9.99,
            localCurrency: "usd", // same as billed → no sub-label
          },
        },
      ]);

      await renderPage({});

      const section = screen.getByTestId("products-checkout-section");
      expect(section.getAttribute("data-has-price-sub-labels")).toBe("");
    });
  });
});
