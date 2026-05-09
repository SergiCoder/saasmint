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

const mockRedirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

const mockGetCurrentUser = vi.fn<() => Promise<User>>();
vi.mock("@/app/[locale]/(app)/_data/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockListPlans = vi.fn<(currency: string) => Promise<Plan[]>>();
vi.mock("@/infrastructure/registry", () => ({
  planGateway: { listPlans: (c: string) => mockListPlans(c) },
}));

// Stub CheckoutButton — we only need to verify the page renders it with the
// correct plan price id. The real component's form + action wiring is
// covered by tests/app/subscription/_components/CheckoutButton.test.tsx.
vi.mock("@/app/[locale]/(app)/subscription/_components/CheckoutButton", () => ({
  CheckoutButton: (props: {
    field: { name: string; value: string };
    children: React.ReactNode;
  }) =>
    React.createElement(
      "button",
      {
        "data-testid": "checkout-button",
        "data-field-name": props.field.name,
        "data-plan-price-id": props.field.value,
      },
      props.children,
    ),
}));

// --- Import under test (after mocks) -------------------------------------

const { default: CheckoutPage } =
  await import("@/app/[locale]/(app)/subscription/checkout/page");

// --- Helpers -------------------------------------------------------------

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

function makePersonalPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan_pro_month",
    name: "Pro",
    description: "For individuals",
    context: "personal",
    tier: 3,
    interval: "month",
    price: {
      id: "price_pro_month",
      amount: 1900,
      displayAmount: 19,
      currency: "usd",
      localDisplayAmount: null,
      localCurrency: null,
    },
    ...overrides,
  };
}

async function renderPage(searchParams: { plan?: string }) {
  const jsx = await CheckoutPage({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(jsx as React.ReactElement);
}

// --- Tests ---------------------------------------------------------------

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(makeUser());
    mockListPlans.mockResolvedValue([makePersonalPlan()]);
  });

  it("redirects to /subscription when the plan query param is missing", async () => {
    await expect(renderPage({})).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockRedirect).toHaveBeenCalledWith("/en/subscription");
    // `getPlans` is hoisted into the page's initial `Promise.all` so it
    // overlaps the user fetch and the translation loads. The catalog call
    // is therefore expected on this code path even though the redirect
    // discards the result — the wasted RTT only fires when the plan param
    // is missing (a degenerate case), not on the happy path.
  });

  it("redirects to /subscription when no plan matches the given planPriceId", async () => {
    await expect(renderPage({ plan: "price_does_not_exist" })).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(mockRedirect).toHaveBeenCalledWith("/en/subscription");
  });

  it("redirects to /subscription when the matched plan has team context", async () => {
    const team = makePersonalPlan({
      id: "plan_team_pro_month",
      context: "team",
      price: {
        id: "price_team_pro_month",
        amount: 4900,
        displayAmount: 49,
        currency: "usd",
        localDisplayAmount: null,
        localCurrency: null,
      },
    });
    mockListPlans.mockResolvedValue([team]);

    await expect(renderPage({ plan: "price_team_pro_month" })).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(mockRedirect).toHaveBeenCalledWith("/en/subscription");
  });

  it("does NOT create a Stripe session on GET — no subscription gateway is imported", async () => {
    // The page must not perform a side-effect on GET (the pre-fix behaviour).
    // Rendering with a valid plan should only look up the plan catalog and
    // render a confirmation UI; no checkout session is created until the
    // user submits the CheckoutButton form (covered by its own test).
    await renderPage({ plan: "price_pro_month" });
    // Only the plan catalog call happened — no billing endpoint was touched.
    expect(mockListPlans).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("renders CheckoutButton with the matched plan's price id when valid", async () => {
    await renderPage({ plan: "price_pro_month" });

    const button = screen.getByTestId("checkout-button");
    expect(button).toHaveAttribute("data-plan-price-id", "price_pro_month");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("passes the user's preferred currency through to planGateway.listPlans", async () => {
    mockGetCurrentUser.mockResolvedValue(
      makeUser({ preferredCurrency: "eur" }),
    );

    await renderPage({ plan: "price_pro_month" });

    expect(mockListPlans).toHaveBeenCalledWith("eur");
  });

  it("calls setRequestLocale with the locale from params", async () => {
    await renderPage({ plan: "price_pro_month" });

    expect(setRequestLocaleMock).toHaveBeenCalledWith("en");
  });

  it("renders the checkout heading from the billing namespace", async () => {
    await renderPage({ plan: "price_pro_month" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "checkout",
    );
  });
});
