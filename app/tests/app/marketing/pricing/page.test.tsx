import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";
import type { Plan } from "@/domain/models/Plan";

// --- Mocks ---------------------------------------------------------------

const setRequestLocaleMock = vi.fn();
const mockTranslate = vi.fn((key: string) => key);
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
const mockListUserOrgs = vi.fn(() => Promise.resolve([]));
vi.mock("@/infrastructure/registry", () => ({
  planGateway: { listPlans: (c?: string) => mockListPlans(c) },
  subscriptionGateway: { listSubscriptions: () => mockListSubscriptions() },
  productGateway: { listProducts: () => mockListProducts() },
  orgGateway: { listUserOrgs: () => mockListUserOrgs() },
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

vi.mock("@/presentation/components/organisms/ProductsGrid", () => ({
  ProductsGrid: () =>
    React.createElement("div", { "data-testid": "products-grid" }),
}));

vi.mock("@/app/[locale]/(app)/subscription/_components/CheckoutButton", () => ({
  CheckoutButton: ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      "button",
      { "data-testid": "checkout-button", type: "button" },
      children,
    ),
}));

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/TeamCheckoutButton",
  () => ({
    TeamCheckoutButton: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        "button",
        { "data-testid": "team-checkout-button", type: "button" },
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
