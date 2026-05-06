import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { Plan } from "@/domain/models/Plan";
import type { Subscription } from "@/domain/models/Subscription";

vi.mock("@/app/actions/billing", () => ({
  openBillingPortal: vi.fn(),
  startCheckout: vi.fn(),
  changePlan: vi.fn(),
}));

import { renderPlanUpgradeCta } from "@/app/[locale]/(app)/subscription/_lib/renderPlanUpgradeCta";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlan(
  overrides: Partial<Plan> & { id: string; context?: Plan["context"] },
): Plan {
  return {
    id: overrides.id,
    name: overrides.name ?? "Pro",
    description: overrides.description ?? "",
    context: overrides.context ?? "personal",
    tier: overrides.tier ?? 3,
    interval: overrides.interval ?? "month",
    price:
      overrides.price !== undefined
        ? overrides.price
        : {
            id: "price_1",
            amount: 1900,
            displayAmount: 19,
            currency: "usd",
            localDisplayAmount: null,
            localCurrency: null,
          },
  };
}

function makeSubscription(context: "personal" | "team"): Subscription {
  const plan = makePlan({ id: `sub-plan-${context}`, context });
  return {
    id: `sub-${context}`,
    status: "active",
    plan,
    seatLimit: 1,
    seatsUsed: 1,
    trialEndsAt: null,
    currentPeriodStart: "2024-01-01T00:00:00Z",
    currentPeriodEnd: "2024-02-01T00:00:00Z",
    cancelAt: null,
    canceledAt: null,
    scheduledPlan: null,
    scheduledChangeAt: null,
    createdAt: "2024-01-01T00:00:00Z",
  };
}

// Echo-style test stubs matching the global next-intl stub: return the key
// and append params so assertions can detect interpolation when needed.
const tBilling = (key: string, values?: Record<string, string | number>) =>
  values
    ? `${key}|${Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(",")}`
    : key;
const tPlans = (key: string) => key;

const defaultOpts = {
  isUpgrade: true,
  isCurrent: false,
  isTeam: false,
  upgradeLabel: "Upgrade",
  changePlanLabel: "Change plan",
  hasOrg: false,
  personalSubscription: null,
  teamSubscription: null,
  personalCanManage: true,
  teamCanManage: true,
  locale: "en",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tBilling: tBilling as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tPlans: tPlans as any,
};

// ---------------------------------------------------------------------------
// Guard rails
// ---------------------------------------------------------------------------

describe("renderPlanUpgradeCta — guard rails", () => {
  it("returns null when the plan has no price", () => {
    const plan = makePlan({ id: "free", price: null });
    const result = renderPlanUpgradeCta({ ...defaultOpts, plan });
    expect(result).toBeNull();
  });

  it("returns null when isUpgrade is false and there is no sub in context", () => {
    const plan = makePlan({ id: "p1" });
    const result = renderPlanUpgradeCta({
      ...defaultOpts,
      plan,
      isUpgrade: false,
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Personal plan — no existing subscription → CheckoutButton
// ---------------------------------------------------------------------------

describe("renderPlanUpgradeCta — personal first-time checkout", () => {
  it("renders a CheckoutButton (form with hidden planPriceId) when there is no personal sub", () => {
    const plan = makePlan({ id: "personal-pro", context: "personal" });
    const result = renderPlanUpgradeCta({
      ...defaultOpts,
      plan,
      isTeam: false,
      personalSubscription: null,
    });
    const { container } = render(<>{result}</>);
    const hidden = container.querySelector(
      'input[type="hidden"][name="planPriceId"]',
    ) as HTMLInputElement | null;
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe("price_1");
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Personal plan — existing subscription → ChangePlanButton (in-app confirm)
// ---------------------------------------------------------------------------

describe("renderPlanUpgradeCta — personal change-plan via in-app confirm", () => {
  it("renders a ChangePlanButton when a personal sub exists and target price > current", () => {
    const plan = makePlan({
      id: "personal-pro",
      context: "personal",
      price: {
        id: "price_pro",
        amount: 4900,
        displayAmount: 49,
        currency: "usd",
        localDisplayAmount: null,
        localCurrency: null,
      },
    });
    const personalSub = makeSubscription("personal");
    const { container } = render(
      <>
        {renderPlanUpgradeCta({
          ...defaultOpts,
          plan,
          isTeam: false,
          personalSubscription: personalSub,
          personalCanManage: true,
        })}
      </>,
    );
    // No portal form/hidden inputs — the in-app dialog is the new path.
    expect(
      container.querySelector('input[name="flow"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('input[name="planPriceId"]'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument();
  });

  it("returns null when the user is not a billing manager on the personal sub", () => {
    const plan = makePlan({ id: "personal-pro", context: "personal" });
    const personalSub = makeSubscription("personal");
    const result = renderPlanUpgradeCta({
      ...defaultOpts,
      plan,
      isTeam: false,
      personalSubscription: personalSub,
      personalCanManage: false,
    });
    expect(result).toBeNull();
  });

  it("renders a 'Scheduled' status label (no actionable CTA) when a schedule already targets this exact plan", () => {
    // The undo lives on the *current* plan card's banner ("Keep current
    // plan"); rendering a Switch button here would be a confusing second
    // way to undo. Instead, the target card gets a non-actionable
    // "Scheduled — {date}" label so the user sees which plan they're
    // moving to.
    const plan = makePlan({
      id: "personal-basic",
      context: "personal",
      tier: 2,
    });
    const sub: Subscription = {
      ...makeSubscription("personal"),
      scheduledPlan: plan,
      scheduledChangeAt: "2024-02-01T00:00:00Z",
    };
    const result = renderPlanUpgradeCta({
      ...defaultOpts,
      plan,
      isTeam: false,
      personalSubscription: sub,
      personalCanManage: true,
    });
    const { container } = render(<>{result}</>);
    // Echo-format from the test stub: `key:date=<formatted>`.
    expect(container.textContent).toMatch(/scheduledPlanLabel/);
    // No interactive control on the scheduled-target card.
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Team plan — no existing subscription → TeamCheckoutButton (link)
// ---------------------------------------------------------------------------

describe("renderPlanUpgradeCta — team first-time checkout", () => {
  it("renders a link to the team-checkout page when no team sub exists and user has no org", () => {
    const plan = makePlan({ id: "team-basic", context: "team", tier: 2 });
    const result = renderPlanUpgradeCta({
      ...defaultOpts,
      plan,
      isTeam: true,
      teamSubscription: null,
      hasOrg: false,
    });
    const { getByRole } = render(<>{result}</>);
    const link = getByRole("link", { name: "Upgrade" });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toContain("team-checkout");
  });

  it("returns null for team first-time checkout when the user already has an org (rule 8)", () => {
    const plan = makePlan({ id: "team-basic", context: "team", tier: 2 });
    const result = renderPlanUpgradeCta({
      ...defaultOpts,
      plan,
      isTeam: true,
      teamSubscription: null,
      hasOrg: true,
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Team plan — existing subscription → ChangePlanButton (in-app confirm)
// ---------------------------------------------------------------------------

describe("renderPlanUpgradeCta — team change-plan via in-app confirm", () => {
  it("renders a ChangePlanButton when a team sub exists", () => {
    const plan = makePlan({
      id: "team-pro",
      context: "team",
      tier: 3,
      price: {
        id: "price_team_pro",
        amount: 9900,
        displayAmount: 99,
        currency: "usd",
        localDisplayAmount: null,
        localCurrency: null,
      },
    });
    const teamSub = makeSubscription("team");
    render(
      <>
        {renderPlanUpgradeCta({
          ...defaultOpts,
          plan,
          isTeam: true,
          teamSubscription: teamSub,
          teamCanManage: true,
        })}
      </>,
    );
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument();
  });

  it("returns null when the user cannot manage the team sub", () => {
    const plan = makePlan({ id: "team-pro", context: "team", tier: 3 });
    const teamSub = makeSubscription("team");
    const result = renderPlanUpgradeCta({
      ...defaultOpts,
      plan,
      isTeam: true,
      teamSubscription: teamSub,
      teamCanManage: false,
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// highlighted (pro tier) → primary variant
// ---------------------------------------------------------------------------

describe("renderPlanUpgradeCta — highlighted flag", () => {
  it("applies the primary variant for a pro-tier personal checkout button", () => {
    const plan = makePlan({ id: "personal-pro", context: "personal", tier: 3 });
    const result = renderPlanUpgradeCta({
      ...defaultOpts,
      plan,
      isTeam: false,
      personalSubscription: null,
    });
    render(<>{result}</>);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-variant",
      "primary",
    );
  });

  it("applies the secondary variant for a non-pro personal checkout button", () => {
    const plan = makePlan({
      id: "personal-basic",
      context: "personal",
      tier: 2,
    });
    const result = renderPlanUpgradeCta({
      ...defaultOpts,
      plan,
      isTeam: false,
      personalSubscription: null,
    });
    render(<>{result}</>);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });
});
