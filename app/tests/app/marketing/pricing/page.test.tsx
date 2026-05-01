import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";
import type { Plan } from "@/domain/models/Plan";

// --- Mocks ---------------------------------------------------------------

const setRequestLocaleMock = vi.fn();
// Echo the key when called without params; interpolate `{name}` placeholders
// when called with a params object so component tests can assert on the
// substituted value (e.g. orgName -> "Acme" in the team-option label).
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

const mockGetOptionalUser = vi.fn<() => Promise<User | null>>();
vi.mock("@/app/[locale]/(marketing)/_data/getOptionalUser", () => ({
  getOptionalUser: () => mockGetOptionalUser(),
}));

const mockListPlans = vi.fn<(currency?: string) => Promise<Plan[]>>();
const mockListSubscriptions = vi.fn(() => Promise.resolve([] as unknown[]));
const mockListProducts = vi.fn(() => Promise.resolve([]));
vi.mock("@/infrastructure/registry", () => ({
  planGateway: { listPlans: (c?: string) => mockListPlans(c) },
  subscriptionGateway: { listSubscriptions: () => mockListSubscriptions() },
  productGateway: { listProducts: () => mockListProducts() },
}));

// Stub heavy presentational organisms — we want to inspect the CTAs the page
// rendered for each group, not the full pricing grid markup.
vi.mock("@/presentation/components/organisms/PricingSection", () => ({
  PricingSection: (props: {
    title: string;
    groups: Array<{
      key: string;
      tier: number;
      context: string;
      monthly?: { cta: React.ReactNode } | null;
      yearly?: { cta: React.ReactNode } | null;
    }>;
  }) =>
    React.createElement(
      "section",
      { "data-testid": `pricing-section-${props.title}` },
      props.groups.map((g) =>
        React.createElement(
          "div",
          {
            key: g.key,
            "data-testid": `group-${g.context}-${g.tier}`,
            "data-has-monthly-cta": Boolean(g.monthly?.cta) ? "true" : "false",
            "data-has-yearly-cta": Boolean(g.yearly?.cta) ? "true" : "false",
          },
          g.monthly?.cta ?? null,
        ),
      ),
    ),
}));

// `ProductsCheckoutSection` replaced the bare `ProductsGrid` here so the
// pricing page picks up the rule-5b context picker (matches /subscription).
// The mock surfaces the picker-gate props for assertions.
vi.mock(
  "@/app/[locale]/(app)/subscription/_components/ProductsCheckoutSection",
  () => ({
    ProductsCheckoutSection: (props: {
      showPicker: boolean;
      teamOptionLabel: string;
    }) =>
      React.createElement("div", {
        "data-testid": "products-checkout-section",
        "data-show-picker": props.showPicker ? "true" : "false",
        "data-team-option-label": props.teamOptionLabel,
      }),
  }),
);

const mockGetOrgMembers = vi.fn<() => Promise<unknown[]>>(() =>
  Promise.resolve([]),
);
vi.mock("@/app/[locale]/(app)/_data/getOrgMembers", () => ({
  getOrgMembers: () => mockGetOrgMembers(),
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

vi.mock("@/app/[locale]/(app)/subscription/_components/CheckoutButton", () => ({
  CheckoutButton: ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      "button",
      {
        "data-testid": "checkout-button",
        "data-cta": "checkout",
        type: "button",
      },
      children,
    ),
}));

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/TeamCheckoutButton",
  () => ({
    TeamCheckoutButton: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        "button",
        {
          "data-testid": "team-checkout-button",
          "data-cta": "team-checkout",
          type: "button",
        },
        children,
      ),
  }),
);

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/BillingPortalButton",
  () => ({
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
          "data-testid": "portal-button",
          "data-cta": "portal",
          "data-context": context ?? "",
          type: "button",
        },
        children,
      ),
  }),
);

// --- Import under test (after mocks) -------------------------------------

const { default: PricingPage } =
  await import("@/app/[locale]/(marketing)/pricing/page");

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

function makePaidPlan(overrides: Partial<Plan> & { id: string }): Plan {
  return {
    id: overrides.id,
    name: overrides.name ?? "Basic",
    description: overrides.description ?? "",
    context: overrides.context ?? "personal",
    tier: overrides.tier ?? 2,
    interval: overrides.interval ?? "month",
    price: overrides.price ?? {
      id: `${overrides.id}-price`,
      amount: 1900,
      displayAmount: 19,
      currency: "usd",
    },
  };
}

async function renderPage() {
  const jsx = await PricingPage({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve({}),
  });
  return render(jsx as React.ReactElement);
}

// --- Tests ----------------------------------------------------------------

describe("Marketing PricingPage — synthetic free plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPlans.mockResolvedValue([
      makePaidPlan({ id: "basic-m", tier: 2, interval: "month" }),
      makePaidPlan({
        id: "basic-y",
        tier: 2,
        interval: "year",
        price: {
          id: "basic-y-price",
          amount: 19000,
          displayAmount: 190,
          currency: "usd",
        },
      }),
    ]);
  });

  it("renders the synthetic Free plan group alongside the paid plans for signed-out visitors", async () => {
    mockGetOptionalUser.mockResolvedValue(null);

    await renderPage();

    // Synthetic free plan appears as a personal-tier-1 group, even though the
    // backend catalog only returns paid plans (free row dropped in v0.7.0).
    expect(screen.getByTestId("group-personal-1")).toBeInTheDocument();
    // Paid tier 2 still appears.
    expect(screen.getByTestId("group-personal-2")).toBeInTheDocument();
  });

  it("renders a /signup CTA on the Free plan card for signed-out visitors", async () => {
    mockGetOptionalUser.mockResolvedValue(null);

    await renderPage();

    const freeGroup = screen.getByTestId("group-personal-1");
    // The Free CTA is a GetStartedButton (anchor) linking to plain /signup —
    // see GetStartedButton.test.tsx for the exact href shape.
    const link = freeGroup.querySelector("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", "/signup");
  });

  it("suppresses the Free plan CTA for signed-in users (no downgrade CTA convention)", async () => {
    mockGetOptionalUser.mockResolvedValue(makeUser());

    await renderPage();

    const freeGroup = screen.getByTestId("group-personal-1");
    // Both monthly and yearly variants render with no CTA element.
    expect(freeGroup).toHaveAttribute("data-has-monthly-cta", "false");
    expect(freeGroup).toHaveAttribute("data-has-yearly-cta", "false");
    expect(freeGroup.querySelector("a")).toBeNull();
  });

  it("calls subscriptionGateway.listSubscriptions for signed-in users (envelope-based fetch)", async () => {
    mockGetOptionalUser.mockResolvedValue(makeUser());

    await renderPage();

    expect(mockListSubscriptions).toHaveBeenCalledTimes(1);
  });

  it("does not call subscriptionGateway.listSubscriptions for anonymous visitors", async () => {
    mockGetOptionalUser.mockResolvedValue(null);

    await renderPage();

    expect(mockListSubscriptions).not.toHaveBeenCalled();
  });

  it("recovers to an empty subscription list when the subscription gateway throws", async () => {
    mockGetOptionalUser.mockResolvedValue(makeUser());
    mockListSubscriptions.mockRejectedValueOnce(new Error("API 500"));

    // The .catch(() => []) on the gateway call must keep the page renderable.
    await renderPage();

    expect(screen.getByTestId("group-personal-1")).toBeInTheDocument();
  });
});

describe("Marketing PricingPage — credit-purchase context picker (rule 5b)", () => {
  // Mirrors the subscription page picker logic: only render the
  // personal-vs-team radio when the caller is the org owner with concurrent
  // personal+team subs, since otherwise the backend default routing is
  // unambiguous and the picker would just add noise.

  beforeEach(() => {
    vi.clearAllMocks();
    mockListPlans.mockResolvedValue([]);
  });

  function makeSub(context: "personal" | "team") {
    return {
      id: `sub_${context}`,
      status: "active",
      plan: { id: `plan_${context}`, context, tier: 2, interval: "month" },
      quantity: 1,
      trialEndsAt: null,
      currentPeriodStart: "2026-01-01T00:00:00Z",
      currentPeriodEnd: "2026-02-01T00:00:00Z",
      cancelAt: null,
      canceledAt: null,
      createdAt: "2026-01-01T00:00:00Z",
    };
  }

  it("shows the picker when an org owner has concurrent personal+team subs", async () => {
    const user = makeUser();
    mockGetOptionalUser.mockResolvedValue(user);
    mockListSubscriptions.mockResolvedValue([
      makeSub("personal"),
      makeSub("team"),
    ]);
    mockGetUserOrgs.mockResolvedValue([
      { id: "org_1", name: "Acme", slug: "acme", logoUrl: null },
    ]);
    mockGetOrgMembers.mockResolvedValue([
      {
        id: "m1",
        org: "org_1",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: null,
        },
        role: "owner",
        isBilling: true,
        joinedAt: "2026-01-01T00:00:00Z",
      },
    ]);

    await renderPage();

    const section = screen.getByTestId("products-checkout-section");
    expect(section).toHaveAttribute("data-show-picker", "true");
    // orgName interpolated into the team option label so the user sees
    // their org name, not a generic placeholder.
    expect(section.getAttribute("data-team-option-label") ?? "").toContain(
      "Acme",
    );
  });

  it("hides the picker for an org admin/member even with concurrent subs", async () => {
    // Same concurrent setup, but caller is admin not owner — only the
    // owner can spend org funds, so the picker stays hidden and the
    // backend default routing applies.
    const user = makeUser();
    mockGetOptionalUser.mockResolvedValue(user);
    mockListSubscriptions.mockResolvedValue([
      makeSub("personal"),
      makeSub("team"),
    ]);
    mockGetUserOrgs.mockResolvedValue([
      { id: "org_1", name: "Acme", slug: "acme", logoUrl: null },
    ]);
    mockGetOrgMembers.mockResolvedValue([
      {
        id: "m1",
        org: "org_1",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: null,
        },
        role: "admin",
        isBilling: false,
        joinedAt: "2026-01-01T00:00:00Z",
      },
    ]);

    await renderPage();

    expect(screen.getByTestId("products-checkout-section")).toHaveAttribute(
      "data-show-picker",
      "false",
    );
  });

  it("hides the picker for a single-sub user (no concurrent billing)", async () => {
    const user = makeUser();
    mockGetOptionalUser.mockResolvedValue(user);
    mockListSubscriptions.mockResolvedValue([makeSub("personal")]);
    mockGetUserOrgs.mockResolvedValue([]);

    await renderPage();

    expect(screen.getByTestId("products-checkout-section")).toHaveAttribute(
      "data-show-picker",
      "false",
    );
  });

  it("does not call getOrgMembers when the user has fewer than two subs", async () => {
    // Performance gate: skip the org-members roundtrip when neither the
    // concurrent-subs check nor the org check would change the outcome.
    const user = makeUser();
    mockGetOptionalUser.mockResolvedValue(user);
    mockListSubscriptions.mockResolvedValue([makeSub("personal")]);
    mockGetUserOrgs.mockResolvedValue([]);

    await renderPage();

    expect(mockGetOrgMembers).not.toHaveBeenCalled();
  });
});

describe("Marketing PricingPage — upgrade CTA routing", () => {
  // Same routing matrix as /subscription so the two surfaces stay coherent.
  // Plan changes for an existing in-context subscription go through the
  // Stripe Customer Portal (canonical change-plan surface). Backend rule 8
  // unconditionally 409s a second team checkout for an org owner, so portal
  // is the only legal path for team upgrades too. First-time checkouts
  // keep using Checkout.

  function makeSub(context: "personal" | "team", tier: 2 | 3 = 2) {
    return {
      id: `sub_${context}`,
      status: "active",
      plan: {
        id: `plan_${context}_${tier}`,
        name: tier === 2 ? "Basic" : "Pro",
        description: "",
        context,
        tier,
        interval: "month",
        price: {
          id: `plan_${context}_${tier}-price`,
          amount: tier === 2 ? 1000 : 3000,
          displayAmount: tier === 2 ? 10 : 30,
          currency: "usd",
        },
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

  beforeEach(() => {
    vi.clearAllMocks();
    // Render both Pro plans so we can assert CTAs on the higher-tier card
    // for both contexts. Personal+team Basic plans are also in the catalog
    // because `findPersonalSubscription`/`findTeamSubscription` need a real
    // sub-shaped object to drive `isUpgrade` against.
    mockListPlans.mockResolvedValue([
      makePaidPlan({ id: "p_basic", tier: 2, context: "personal" }),
      makePaidPlan({
        id: "p_pro",
        tier: 3,
        context: "personal",
        price: {
          id: "p_pro-price",
          amount: 3000,
          displayAmount: 30,
          currency: "usd",
        },
      }),
      makePaidPlan({ id: "t_basic", tier: 2, context: "team" }),
      makePaidPlan({
        id: "t_pro",
        tier: 3,
        context: "team",
        price: {
          id: "t_pro-price",
          amount: 3000,
          displayAmount: 30,
          currency: "usd",
        },
      }),
    ]);
  });

  it("routes the team-pro upgrade CTA to the billing portal for an existing team-basic subscriber (regression: button was missing)", async () => {
    // Concurrent personal+team basic subscriber, billing member of the
    // team — should see actionable upgrade CTAs on both pro cards, both
    // wired to the portal with the matching ?context=.
    const user = makeUser();
    mockGetOptionalUser.mockResolvedValue(user);
    mockListSubscriptions.mockResolvedValue([
      makeSub("personal"),
      makeSub("team"),
    ]);
    mockGetUserOrgs.mockResolvedValue([
      { id: "org_1", name: "Acme", slug: "acme", logoUrl: null },
    ]);
    mockCanManageBilling.mockResolvedValue(true);

    await renderPage();

    const teamProCta = screen
      .getByTestId("group-team-3")
      .querySelector("[data-cta]") as HTMLElement | null;
    expect(teamProCta?.getAttribute("data-cta")).toBe("portal");
    expect(teamProCta?.getAttribute("data-context")).toBe("team");

    const personalProCta = screen
      .getByTestId("group-personal-3")
      .querySelector("[data-cta]") as HTMLElement | null;
    expect(personalProCta?.getAttribute("data-cta")).toBe("portal");
    expect(personalProCta?.getAttribute("data-context")).toBe("personal");
  });

  it("hides the team-pro upgrade CTA for a non-billing org member with a personal sub", async () => {
    // Org member, not the billing one, has their own personal-basic sub.
    // Personal upgrade is theirs to make; team upgrade is the billing
    // member's call — the team-pro CTA must be hidden.
    const user = makeUser();
    mockGetOptionalUser.mockResolvedValue(user);
    mockListSubscriptions.mockResolvedValue([
      makeSub("personal"),
      makeSub("team"),
    ]);
    mockGetUserOrgs.mockResolvedValue([
      { id: "org_1", name: "Acme", slug: "acme", logoUrl: null },
    ]);
    mockCanManageBilling.mockImplementation(
      async (_user, sub) => sub.plan.context === "personal",
    );

    await renderPage();

    const teamProSlot = screen.getByTestId("group-team-3");
    expect(teamProSlot.querySelector("[data-cta]")).toBeNull();

    // Personal upgrade still routes through the portal — that's the
    // user's own sub.
    const personalProCta = screen
      .getByTestId("group-personal-3")
      .querySelector("[data-cta]") as HTMLElement | null;
    expect(personalProCta?.getAttribute("data-cta")).toBe("portal");
  });

  it("uses the first-time team-checkout CTA when a signed-in user has no team sub and no org", async () => {
    const user = makeUser();
    mockGetOptionalUser.mockResolvedValue(user);
    mockListSubscriptions.mockResolvedValue([]);
    mockGetUserOrgs.mockResolvedValue([]);

    await renderPage();

    const teamProCta = screen
      .getByTestId("group-team-3")
      .querySelector("[data-cta]") as HTMLElement | null;
    expect(teamProCta?.getAttribute("data-cta")).toBe("team-checkout");
  });

  it("suppresses the team upgrade CTA for an org owner with no team sub (rule 8 would 409)", async () => {
    // Owns an org but has no team sub on it (e.g. cancelled). A fresh
    // team checkout would 409 with org_already_owned, so the CTA stays
    // hidden until resolved out of band.
    const user = makeUser();
    mockGetOptionalUser.mockResolvedValue(user);
    mockListSubscriptions.mockResolvedValue([]);
    mockGetUserOrgs.mockResolvedValue([
      { id: "org_1", name: "Acme", slug: "acme", logoUrl: null },
    ]);

    await renderPage();

    const teamProSlot = screen.getByTestId("group-team-3");
    expect(teamProSlot.querySelector("[data-cta]")).toBeNull();
  });

  it("keeps the signed-out checkout-style CTA on every paid card for anonymous visitors", async () => {
    // Signed-out path is unchanged: GetStartedButton everywhere, no
    // canManage probe, no subscription fetch.
    mockGetOptionalUser.mockResolvedValue(null);

    await renderPage();

    expect(mockCanManageBilling).not.toHaveBeenCalled();
    // Pro cards both render anchors (GetStartedButton renders a real <a>).
    expect(
      screen.getByTestId("group-team-3").querySelector("a"),
    ).not.toBeNull();
    expect(
      screen.getByTestId("group-personal-3").querySelector("a"),
    ).not.toBeNull();
  });
});
