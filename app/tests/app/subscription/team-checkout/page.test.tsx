import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";
import type { Plan } from "@/domain/models/Plan";
import type { Subscription } from "@/domain/models/Subscription";

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

const mockGetSubscriptions = vi.fn<() => Promise<Subscription[]>>();
vi.mock("@/app/[locale]/(app)/_data/getSubscriptions", () => ({
  getSubscriptions: () => mockGetSubscriptions(),
}));

const mockListPlans = vi.fn<(currency: string) => Promise<Plan[]>>();
vi.mock("@/infrastructure/registry", () => ({
  planGateway: { listPlans: (c: string) => mockListPlans(c) },
}));

// Stub the client form so we don't drag its React state + child atoms into
// this server-page test. We only need to verify the page mounts it with the
// right props.
vi.mock(
  "@/app/[locale]/(app)/subscription/team-checkout/_components/TeamCheckoutForm",
  () => ({
    TeamCheckoutForm: (props: Record<string, unknown>) =>
      React.createElement("div", {
        "data-testid": "team-checkout-form",
        "data-plan-price-id": props.planPriceId as string,
        "data-plan-name": props.planName as string,
        "data-display-amount": String(props.displayAmount),
        "data-currency": props.currency as string,
        "data-interval": props.interval as string,
        "data-personal-sub-notice":
          (props.personalSubAutoCancelNotice as string | undefined) ?? "",
      }),
  }),
);

// --- Import under test (after mocks) -------------------------------------

const { default: TeamCheckoutPage } =
  await import("@/app/[locale]/(app)/subscription/team-checkout/page");

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

function makeTeamPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan_team_pro_year",
    name: "Team Pro",
    description: "For growing teams",
    context: "team",
    tier: 3,
    interval: "year",
    price: {
      id: "price_team_pro_year",
      amount: 48000,
      displayAmount: 480,
      currency: "usd",
    },
    ...overrides,
  };
}

function makePersonalSubscription(
  overrides: Partial<Subscription> = {},
): Subscription {
  return {
    id: "sub_personal_1",
    status: "active",
    plan: {
      id: "plan_personal_pro_month",
      name: "Personal Pro",
      description: "Personal plan",
      context: "personal",
      tier: 3,
      interval: "month",
      price: {
        id: "price_personal_pro_month",
        amount: 1900,
        displayAmount: 19,
        currency: "usd",
      },
    },
    seatLimit: 1,
    seatsUsed: 1,
    trialEndsAt: null,
    currentPeriodStart: "2026-04-01T00:00:00Z",
    currentPeriodEnd: "2026-05-01T00:00:00Z",
    cancelAt: null,
    canceledAt: null,
    scheduledPlan: null,
    scheduledChangeAt: null,
    createdAt: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

async function renderPage(searchParams: { plan?: string }) {
  const jsx = await TeamCheckoutPage({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(jsx as React.ReactElement);
}

// --- Tests ---------------------------------------------------------------

describe("TeamCheckoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(makeUser());
    mockGetSubscriptions.mockResolvedValue([]);
    mockListPlans.mockResolvedValue([makeTeamPlan()]);
  });

  it("redirects to /subscription when the plan query param is missing", async () => {
    await expect(renderPage({})).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockRedirect).toHaveBeenCalledWith("/subscription");
    // Don't hit the API for plans until we know the plan id is present.
    expect(mockListPlans).not.toHaveBeenCalled();
  });

  it("redirects to /subscription when no plan matches the given planPriceId", async () => {
    mockListPlans.mockResolvedValue([makeTeamPlan()]);

    await expect(renderPage({ plan: "price_does_not_exist" })).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(mockRedirect).toHaveBeenCalledWith("/subscription");
  });

  it("redirects to /subscription when the matched plan has personal context", async () => {
    const personal = makeTeamPlan({
      context: "personal",
      price: {
        id: "price_personal_pro_month",
        amount: 1900,
        displayAmount: 19,
        currency: "usd",
      },
    });
    mockListPlans.mockResolvedValue([personal]);

    await expect(
      renderPage({ plan: "price_personal_pro_month" }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockRedirect).toHaveBeenCalledWith("/subscription");
  });

  it("passes the user's preferred currency through to planGateway.listPlans", async () => {
    mockGetCurrentUser.mockResolvedValue(
      makeUser({ preferredCurrency: "eur" }),
    );

    await renderPage({ plan: "price_team_pro_year" });

    expect(mockListPlans).toHaveBeenCalledWith("eur");
  });

  it("calls setRequestLocale with the locale from params", async () => {
    await renderPage({ plan: "price_team_pro_year" });

    expect(setRequestLocaleMock).toHaveBeenCalledWith("en");
  });

  it("renders TeamCheckoutForm with the matched plan's data when the plan is a valid team plan", async () => {
    await renderPage({ plan: "price_team_pro_year" });

    const form = screen.getByTestId("team-checkout-form");
    expect(form).toHaveAttribute("data-plan-price-id", "price_team_pro_year");
    expect(form).toHaveAttribute("data-display-amount", "480");
    expect(form).toHaveAttribute("data-currency", "usd");
    expect(form).toHaveAttribute("data-interval", "year");
    // planName comes from translatePlanName which feeds into the stub translator
    // as the literal key; the echoing i18n stub returns it unchanged.
    expect(form).toHaveAttribute("data-plan-name", "team.3.name");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("renders the teamCheckout heading from the billing namespace", async () => {
    await renderPage({ plan: "price_team_pro_year" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "teamCheckout",
    );
  });

  it("does not pass a personal-sub notice when the caller has no subscription", async () => {
    mockGetSubscriptions.mockResolvedValue([]);

    await renderPage({ plan: "price_team_pro_year" });

    const form = screen.getByTestId("team-checkout-form");
    expect(form).toHaveAttribute("data-personal-sub-notice", "");
  });

  it("passes the personal-sub auto-cancel notice when the caller has an active personal subscription", async () => {
    mockGetSubscriptions.mockResolvedValue([makePersonalSubscription()]);

    await renderPage({ plan: "price_team_pro_year" });

    const form = screen.getByTestId("team-checkout-form");
    // The local translator stub echoes the key; we just verify the notice
    // prop is populated, which only happens when the active personal-sub
    // branch fires.
    expect(form).toHaveAttribute(
      "data-personal-sub-notice",
      "personalSubAutoCancelNotice",
    );
  });

  it("does not pass a personal-sub notice when the personal subscription is already scheduled to cancel", async () => {
    mockGetSubscriptions.mockResolvedValue([
      makePersonalSubscription({ cancelAt: "2026-05-01T00:00:00Z" }),
    ]);

    await renderPage({ plan: "price_team_pro_year" });

    const form = screen.getByTestId("team-checkout-form");
    expect(form).toHaveAttribute("data-personal-sub-notice", "");
  });

  it("does not pass a personal-sub notice when the active subscription is team-context", async () => {
    mockGetSubscriptions.mockResolvedValue([
      makePersonalSubscription({
        plan: {
          id: "plan_team",
          name: "Team",
          description: "Team",
          context: "team",
          tier: 3,
          interval: "month",
          price: null,
        },
      }),
    ]);

    await renderPage({ plan: "price_team_pro_year" });

    const form = screen.getByTestId("team-checkout-form");
    expect(form).toHaveAttribute("data-personal-sub-notice", "");
  });

  it("does not pass a personal-sub notice when the personal subscription is trialing (only 'active' qualifies)", async () => {
    mockGetSubscriptions.mockResolvedValue([
      makePersonalSubscription({ status: "trialing" }),
    ]);

    await renderPage({ plan: "price_team_pro_year" });

    const form = screen.getByTestId("team-checkout-form");
    expect(form).toHaveAttribute("data-personal-sub-notice", "");
  });

  it("does not pass a personal-sub notice when currentPeriodEnd is unparseable", async () => {
    mockGetSubscriptions.mockResolvedValue([
      makePersonalSubscription({ currentPeriodEnd: "not-a-date" }),
    ]);

    await renderPage({ plan: "price_team_pro_year" });

    const form = screen.getByTestId("team-checkout-form");
    expect(form).toHaveAttribute("data-personal-sub-notice", "");
  });

  it("formats currentPeriodEnd via Intl.DateTimeFormat and passes it as the 'date' param of the notice translation", async () => {
    mockGetSubscriptions.mockResolvedValue([
      makePersonalSubscription({ currentPeriodEnd: "2026-05-01T00:00:00Z" }),
    ]);

    await renderPage({ plan: "price_team_pro_year" });

    // The translator stub echoes the key, so we verify formatting by checking
    // how `t(...)` was invoked: with the long-format date string for the en
    // locale. The exact string is whatever `Intl.DateTimeFormat("en", { dateStyle: "long" })`
    // produces for that ISO date — recompute it locally to keep the assertion
    // independent of timezone/ICU drift.
    const expectedDate = new Intl.DateTimeFormat("en", {
      dateStyle: "long",
    }).format(new Date("2026-05-01T00:00:00Z"));

    expect(mockTranslate).toHaveBeenCalledWith("personalSubAutoCancelNotice", {
      date: expectedDate,
    });
  });
});
