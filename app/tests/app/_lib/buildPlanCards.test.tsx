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
    tier: overrides.tier ?? "basic",
    interval: overrides.interval ?? "month",
    price: overrides.price ?? { id: `${overrides.id}-price`, amount: 1900 },
  };
}

describe("buildPlanCardGroups", () => {
  it("groups monthly and yearly variants of the same tier into one card", () => {
    const plans: Plan[] = [
      makePlan({
        id: "pb-m",
        tier: "basic",
        interval: "month",
        price: { id: "pm", amount: 1900 },
      }),
      makePlan({
        id: "pb-y",
        tier: "basic",
        interval: "year",
        price: { id: "py", amount: 19000 },
      }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      labels,
      renderCta: () => null,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].monthly?.price).toBe("$19");
    expect(groups[0].yearly?.price).toBe("$190");
  });

  it("computes yearly savings percentage when yearly is cheaper than 12x monthly", () => {
    const plans: Plan[] = [
      makePlan({
        id: "m",
        tier: "pro",
        interval: "month",
        price: { id: "pm", amount: 1000 },
      }),
      makePlan({
        id: "y",
        tier: "pro",
        interval: "year",
        price: { id: "py", amount: 10000 },
      }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      labels,
      renderCta: () => null,
    });
    // 10000 vs 12000 → 16.67% rounded to 17
    expect(groups[0].yearlySavingsPct).toBe(17);
  });

  it("omits yearlySavingsPct when there is no discount", () => {
    const plans: Plan[] = [
      makePlan({
        id: "m",
        interval: "month",
        price: { id: "pm", amount: 1000 },
      }),
      makePlan({
        id: "y",
        interval: "year",
        price: { id: "py", amount: 12000 },
      }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      labels,
      renderCta: () => null,
    });
    expect(groups[0].yearlySavingsPct).toBeUndefined();
  });

  it("sorts groups by tier order: free, basic, pro", () => {
    const plans: Plan[] = [
      makePlan({ id: "pro", tier: "pro" }),
      makePlan({ id: "free", tier: "free", price: null }),
      makePlan({ id: "basic", tier: "basic" }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      labels,
      renderCta: () => null,
    });
    expect(groups.map((g) => g.tier)).toEqual(["free", "basic", "pro"]);
  });

  it("separates personal and team groups", () => {
    const plans: Plan[] = [
      makePlan({ id: "p", context: "personal", tier: "basic" }),
      makePlan({ id: "t", context: "team", tier: "basic" }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      labels,
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
      labels,
      renderCta: () => null,
    });
    expect(groups[0].monthly?.intervalLabel).toBe("seat/month");
  });

  it("marks the pro tier as highlighted", () => {
    const plans: Plan[] = [
      makePlan({ id: "p", tier: "pro" }),
      makePlan({ id: "b", tier: "basic" }),
    ];
    const groups = buildPlanCardGroups({
      plans,
      labels,
      renderCta: () => null,
    });
    const pro = groups.find((g) => g.tier === "pro");
    const basic = groups.find((g) => g.tier === "basic");
    expect(pro?.highlighted).toBe(true);
    expect(basic?.highlighted).toBe(false);
  });

  it("flags the current plan and marks higher-priced plans as upgrades", () => {
    const plans: Plan[] = [
      makePlan({
        id: "basic-m",
        tier: "basic",
        interval: "month",
        price: { id: "bm", amount: 1000 },
      }),
      makePlan({
        id: "pro-m",
        tier: "pro",
        interval: "month",
        price: { id: "pm", amount: 5000 },
      }),
    ];
    const ctaCalls: Array<{
      id: string;
      isCurrent: boolean;
      isUpgrade: boolean;
      label: string;
    }> = [];
    buildPlanCardGroups({
      plans,
      currentPlanId: "basic-m",
      labels,
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

  it("treats personal → team as an upgrade even when the team plan is cheaper", () => {
    const plans: Plan[] = [
      makePlan({
        id: "personal-pro",
        context: "personal",
        tier: "pro",
        interval: "month",
        price: { id: "pp", amount: 5000 },
      }),
      makePlan({
        id: "team-basic",
        context: "team",
        tier: "basic",
        interval: "month",
        price: { id: "tb", amount: 1000 },
      }),
    ];
    const ctaCalls: Array<{ id: string; isUpgrade: boolean }> = [];
    buildPlanCardGroups({
      plans,
      currentPlanId: "personal-pro",
      labels,
      renderCta: ({ plan, isUpgrade }) => {
        ctaCalls.push({ id: plan.id, isUpgrade });
        return null;
      },
    });
    const team = ctaCalls.find((c) => c.id === "team-basic");
    expect(team?.isUpgrade).toBe(true);
  });

  it("treats team → personal as a downgrade even when the personal plan is more expensive", () => {
    const plans: Plan[] = [
      makePlan({
        id: "team-basic",
        context: "team",
        tier: "basic",
        interval: "month",
        price: { id: "tb", amount: 1000 },
      }),
      makePlan({
        id: "personal-pro",
        context: "personal",
        tier: "pro",
        interval: "month",
        price: { id: "pp", amount: 5000 },
      }),
    ];
    const ctaCalls: Array<{ id: string; isUpgrade: boolean }> = [];
    buildPlanCardGroups({
      plans,
      currentPlanId: "team-basic",
      labels,
      renderCta: ({ plan, isUpgrade }) => {
        ctaCalls.push({ id: plan.id, isUpgrade });
        return null;
      },
    });
    const personal = ctaCalls.find((c) => c.id === "personal-pro");
    expect(personal?.isUpgrade).toBe(false);
  });
});
