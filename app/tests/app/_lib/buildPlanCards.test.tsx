import { describe, it, expect } from "vitest";
import { buildPlanCardGroups } from "@/app/[locale]/_lib/buildPlanCards";
import type { Plan } from "@/domain/models/Plan";

const labels = {
  upgrade: "Upgrade",
  seat: "seat",
};

function makePlan(overrides: Partial<Plan> & { id: string }): Plan {
  return {
    id: overrides.id,
    name: overrides.name ?? "Plan",
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

describe("buildPlanCardGroups", () => {
  it("groups monthly and yearly variants of the same tier into one card", () => {
    const plans: Plan[] = [
      makePlan({
        id: "pb-m",
        tier: 2,
        interval: "month",
        price: { id: "pm", amount: 1900, displayAmount: 19, currency: "usd" },
      }),
      makePlan({
        id: "pb-y",
        tier: 2,
        interval: "year",
        price: {
          id: "py",
          amount: 19000,
          displayAmount: 190,
          currency: "usd",
        },
      }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: () => null,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.monthly?.price).toBe("$19.00");
    expect(groups[0]!.yearly?.price).toBe("$190.00");
  });

  it("computes yearly savings percentage when yearly is cheaper than 12x monthly", () => {
    const plans: Plan[] = [
      makePlan({
        id: "m",
        tier: 3,
        interval: "month",
        price: { id: "pm", amount: 1000, displayAmount: 10, currency: "usd" },
      }),
      makePlan({
        id: "y",
        tier: 3,
        interval: "year",
        price: {
          id: "py",
          amount: 10000,
          displayAmount: 100,
          currency: "usd",
        },
      }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: () => null,
    });
    // 100 vs 120 → 16.67% rounded to 17
    expect(groups[0]!.yearlySavingsPct).toBe(17);
  });

  it("omits yearlySavingsPct when there is no discount", () => {
    const plans: Plan[] = [
      makePlan({
        id: "m",
        interval: "month",
        price: { id: "pm", amount: 1000, displayAmount: 10, currency: "usd" },
      }),
      makePlan({
        id: "y",
        interval: "year",
        price: {
          id: "py",
          amount: 12000,
          displayAmount: 120,
          currency: "usd",
        },
      }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: () => null,
    });
    expect(groups[0]!.yearlySavingsPct).toBeUndefined();
  });

  it("sorts groups by tier order: free, basic, pro", () => {
    const plans: Plan[] = [
      makePlan({ id: "pro", tier: 3 }),
      makePlan({ id: "free", tier: 1, price: null }),
      makePlan({ id: "basic", tier: 2 }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: () => null,
    });
    expect(groups.map((g) => g.tier)).toEqual([1, 2, 3]);
  });

  it("formats priceless plans using fallbackCurrency when provided", () => {
    const plans: Plan[] = [
      {
        id: "free",
        name: "Free",
        description: "",
        context: "personal",
        tier: 1,
        interval: "month",
        price: null,
      },
    ];
    const groups = buildPlanCardGroups({
      plans,
      locale: "en-US",
      fallbackCurrency: "eur",
      labels,
      planNames: { "personal.1": "Free" },
      planDescriptions: { "personal.1": "Free desc" },
      renderCta: () => null,
    });
    expect(groups[0]!.monthly?.price).toBe("€0.00");
  });

  it("falls back to USD for priceless plans when fallbackCurrency is omitted", () => {
    const plans: Plan[] = [
      {
        id: "free",
        name: "Free",
        description: "",
        context: "personal",
        tier: 1,
        interval: "month",
        price: null,
      },
    ];
    const groups = buildPlanCardGroups({
      plans,
      locale: "en-US",
      labels,
      planNames: { "personal.1": "Free" },
      planDescriptions: { "personal.1": "Free desc" },
      renderCta: () => null,
    });
    expect(groups[0]!.monthly?.price).toBe("$0.00");
  });

  it("separates personal and team groups", () => {
    const plans: Plan[] = [
      makePlan({ id: "p", context: "personal", tier: 2 }),
      makePlan({ id: "t", context: "team", tier: 2 }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: () => null,
    });
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.context).sort()).toEqual(["personal", "team"]);
  });

  it("uses 'per seat/<interval>' label for team plans", () => {
    const plans: Plan[] = [
      makePlan({ id: "tm", context: "team", interval: "month" }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: () => null,
    });
    expect(groups[0]!.monthly?.intervalLabel).toBe("seat/month");
  });

  it("marks the pro tier as highlighted", () => {
    const plans: Plan[] = [
      makePlan({ id: "p", tier: 3 }),
      makePlan({ id: "b", tier: 2 }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: () => null,
    });
    const pro = groups.find((g) => g.tier === 3);
    const basic = groups.find((g) => g.tier === 2);
    expect(pro?.highlighted).toBe(true);
    expect(basic?.highlighted).toBe(false);
  });

  it("flags the current plan and marks higher-priced plans as upgrades", () => {
    const plans: Plan[] = [
      makePlan({
        id: "basic-m",
        tier: 2,
        interval: "month",
        price: { id: "bm", amount: 1000, displayAmount: 10, currency: "usd" },
      }),
      makePlan({
        id: "pro-m",
        tier: 3,
        interval: "month",
        price: { id: "pm", amount: 5000, displayAmount: 50, currency: "usd" },
      }),
    ];
    const ctaCalls: Array<{
      id: string;
      isCurrent: boolean;
      isUpgrade: boolean;
      label: string;
    }> = [];
    const basicMPlan = plans.find((p) => p.id === "basic-m")!;
    buildPlanCardGroups({
      plans,
      currentPlans: [basicMPlan],
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: ({ plan, isCurrent, isUpgrade, ctaLabel }) => {
        ctaCalls.push({
          id: plan.id,
          isCurrent,
          isUpgrade,
          label: ctaLabel,
        });
        return null;
      },
    });
    const basic = ctaCalls.find((c) => c.id === "basic-m");
    const pro = ctaCalls.find((c) => c.id === "pro-m");
    expect(basic?.isCurrent).toBe(true);
    expect(basic?.isUpgrade).toBe(false);
    expect(pro?.isUpgrade).toBe(true);
    expect(pro?.label).toBe("Upgrade");
  });

  it("treats a candidate from a context the user has no sub in as a net-new upgrade", () => {
    // Concurrent personal+team is allowed (rule 5), so a personal-only user
    // looking at a team plan is *adding* a sub, not switching — comparison
    // is against the matching-context current plan (none here), so any
    // priced team option counts as an upgrade.
    const plans: Plan[] = [
      makePlan({
        id: "personal-pro",
        context: "personal",
        tier: 3,
        interval: "month",
        price: { id: "pp", amount: 5000, displayAmount: 50, currency: "usd" },
      }),
      makePlan({
        id: "team-basic",
        context: "team",
        tier: 2,
        interval: "month",
        price: { id: "tb", amount: 1000, displayAmount: 10, currency: "usd" },
      }),
    ];
    const personalProPlan = plans.find((p) => p.id === "personal-pro")!;
    const ctaCalls: Array<{ id: string; isUpgrade: boolean }> = [];
    buildPlanCardGroups({
      plans,
      currentPlans: [personalProPlan],
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: ({ plan, isUpgrade }) => {
        ctaCalls.push({ id: plan.id, isUpgrade });
        return null;
      },
    });
    const team = ctaCalls.find((c) => c.id === "team-basic");
    expect(team?.isUpgrade).toBe(true);
  });

  it("compares within the same context only — team current does not block a personal upgrade", () => {
    // Symmetric to the prior test: a team-only user looking at a personal
    // plan is *adding* a sub, not switching. With no personal current plan
    // to compare against, any priced personal option is an upgrade.
    const plans: Plan[] = [
      makePlan({
        id: "team-basic",
        context: "team",
        tier: 2,
        interval: "month",
        price: { id: "tb", amount: 1000, displayAmount: 10, currency: "usd" },
      }),
      makePlan({
        id: "personal-pro",
        context: "personal",
        tier: 3,
        interval: "month",
        price: { id: "pp", amount: 5000, displayAmount: 50, currency: "usd" },
      }),
    ];
    const teamBasicPlan = plans.find((p) => p.id === "team-basic")!;
    const ctaCalls: Array<{ id: string; isUpgrade: boolean }> = [];
    buildPlanCardGroups({
      plans,
      currentPlans: [teamBasicPlan],
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: ({ plan, isUpgrade }) => {
        ctaCalls.push({ id: plan.id, isUpgrade });
        return null;
      },
    });
    const personal = ctaCalls.find((c) => c.id === "personal-pro");
    expect(personal?.isUpgrade).toBe(true);
  });

  it("flags both rows as current when concurrent personal+team subs are passed", () => {
    const plans: Plan[] = [
      makePlan({
        id: "personal-pro",
        context: "personal",
        tier: 3,
        interval: "month",
        price: { id: "pp", amount: 5000, displayAmount: 50, currency: "usd" },
      }),
      makePlan({
        id: "team-pro",
        context: "team",
        tier: 3,
        interval: "month",
        price: { id: "tp", amount: 8000, displayAmount: 80, currency: "usd" },
      }),
    ];
    const ctaCalls: Array<{ id: string; isCurrent: boolean }> = [];
    buildPlanCardGroups({
      plans,
      currentPlans: plans,
      locale: "en-US",
      labels,
      planNames: {
        "personal.2": "Basic",
        "personal.3": "Pro",
        "personal.1": "Free",
        "team.2": "Basic",
        "team.3": "Pro",
      },
      planDescriptions: {
        "personal.2": "Basic desc",
        "personal.3": "Pro desc",
        "personal.1": "Free desc",
        "team.2": "Team Basic desc",
        "team.3": "Team Pro desc",
      },
      renderCta: ({ plan, isCurrent }) => {
        ctaCalls.push({ id: plan.id, isCurrent });
        return null;
      },
    });
    expect(ctaCalls.find((c) => c.id === "personal-pro")?.isCurrent).toBe(true);
    expect(ctaCalls.find((c) => c.id === "team-pro")?.isCurrent).toBe(true);
  });
});
