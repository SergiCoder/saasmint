import { describe, it, expect, vi } from "vitest";
import {
  buildPlanTranslations,
  buildProductTranslations,
  makeLocalSubLabelFormatter,
  maxYearlySavingsPct,
  splitPlanGroupsByContext,
  type PlanCardGroup,
} from "@/app/[locale]/_lib/buildPlanCards";
import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";

function makePlan(over: Partial<Plan> & { id: string }): Plan {
  return {
    id: over.id,
    name: over.name ?? "Plan",
    description: over.description ?? "",
    context: over.context ?? "personal",
    tier: over.tier ?? 2,
    interval: over.interval ?? "month",
    price: over.price ?? null,
  };
}

function makeProduct(over: Partial<Product> & { id: string }): Product {
  return {
    id: over.id,
    name: over.name ?? "Product",
    type: "one_time",
    credits: over.credits ?? 100,
    price: over.price ?? null,
  };
}

function makeGroup(over: Partial<PlanCardGroup>): PlanCardGroup {
  return {
    key: over.key ?? "personal-2",
    name: over.name ?? "Basic",
    description: over.description ?? "",
    highlighted: over.highlighted ?? false,
    context: over.context ?? "personal",
    tier: over.tier ?? 2,
    monthly: over.monthly,
    yearly: over.yearly,
    yearlySavingsPct: over.yearlySavingsPct,
  };
}

describe("buildPlanTranslations", () => {
  it("requests one name + description per (context, tier) and deduplicates", () => {
    const tPlans = vi.fn((key: string) => `t:${key}`) as unknown as (
      key: never,
    ) => string;
    const plans: Plan[] = [
      makePlan({ id: "a", context: "personal", tier: 2, interval: "month" }),
      makePlan({ id: "b", context: "personal", tier: 2, interval: "year" }),
      makePlan({ id: "c", context: "team", tier: 3, interval: "month" }),
    ];

    const { planNames, planDescriptions } = buildPlanTranslations(
      plans,
      tPlans,
    );

    expect(planNames).toEqual({
      "personal.2": "t:personal.2.name",
      "team.3": "t:team.3.name",
    });
    expect(planDescriptions).toEqual({
      "personal.2": "t:personal.2.description",
      "team.3": "t:team.3.description",
    });
    // 2 unique keys × 2 lookups (name + description)
    expect(tPlans).toHaveBeenCalledTimes(4);
  });

  it("returns empty maps when no plans are provided", () => {
    const tPlans = vi.fn() as unknown as (key: never) => string;
    expect(buildPlanTranslations([], tPlans)).toEqual({
      planNames: {},
      planDescriptions: {},
    });
  });
});

describe("buildProductTranslations", () => {
  it("maps each product's credit count to its translated name", () => {
    const tProducts = vi.fn((key: string) => `c:${key}`) as unknown as (
      key: never,
    ) => string;
    const products: Product[] = [
      makeProduct({ id: "p1", credits: 100 }),
      makeProduct({ id: "p2", credits: 500 }),
    ];

    expect(buildProductTranslations(products, tProducts)).toEqual({
      100: "c:100",
      500: "c:500",
    });
  });

  it("returns an empty record for an empty product list", () => {
    const tProducts = vi.fn() as unknown as (key: never) => string;
    expect(buildProductTranslations([], tProducts)).toEqual({});
  });
});

describe("makeLocalSubLabelFormatter", () => {
  it("dispatches monthly intervals to the billedInLocalMonthly key", () => {
    const t = vi.fn((key: string, values: Record<string, string>) => {
      return `${key}:${JSON.stringify(values)}`;
    }) as unknown as (
      key: "billedInLocalMonthly" | "billedInLocalYearly",
      values: Record<string, string>,
    ) => string;
    const format = makeLocalSubLabelFormatter(t);

    const out = format({
      interval: "month",
      localAmount: "€18",
      monthlyEquivalent: "€18",
      billedCurrency: "USD",
    });

    expect(out).toContain("billedInLocalMonthly");
    expect(out).toContain("€18");
    expect(out).toContain("USD");
  });

  it("dispatches yearly intervals to the billedInLocalYearly key with the monthly equivalent", () => {
    const t = vi.fn((key: string, values: Record<string, string>) => {
      return `${key}:${values.amount ?? ""}|${values.monthly ?? ""}|${values.currency ?? ""}`;
    }) as unknown as (
      key: "billedInLocalMonthly" | "billedInLocalYearly",
      values: Record<string, string>,
    ) => string;
    const format = makeLocalSubLabelFormatter(t);

    const out = format({
      interval: "year",
      localAmount: "€180",
      monthlyEquivalent: "€15",
      billedCurrency: "USD",
    });

    expect(out).toBe("billedInLocalYearly:€180|€15|USD");
  });
});

describe("maxYearlySavingsPct", () => {
  it("returns 0 for an empty list", () => {
    expect(maxYearlySavingsPct([])).toBe(0);
  });

  it("returns 0 when no group has a savings value", () => {
    expect(
      maxYearlySavingsPct([
        makeGroup({ key: "p-2" }),
        makeGroup({ key: "p-3" }),
      ]),
    ).toBe(0);
  });

  it("returns the maximum savings percentage across the group list", () => {
    expect(
      maxYearlySavingsPct([
        makeGroup({ key: "p-2", yearlySavingsPct: 17 }),
        makeGroup({ key: "p-3", yearlySavingsPct: 25 }),
        makeGroup({ key: "p-1" }),
      ]),
    ).toBe(25);
  });
});

describe("splitPlanGroupsByContext", () => {
  it("partitions personal and team groups and computes per-side savings", () => {
    const groups: PlanCardGroup[] = [
      makeGroup({
        key: "p-2",
        context: "personal",
        tier: 2,
        yearlySavingsPct: 10,
      }),
      makeGroup({
        key: "p-3",
        context: "personal",
        tier: 3,
        yearlySavingsPct: 22,
      }),
      makeGroup({
        key: "t-2",
        context: "team",
        tier: 2,
        yearlySavingsPct: 15,
      }),
    ];

    const result = splitPlanGroupsByContext(groups);

    expect(result.personal).toHaveLength(2);
    expect(result.team).toHaveLength(1);
    expect(result.personal.every((g) => g.context === "personal")).toBe(true);
    expect(result.team.every((g) => g.context === "team")).toBe(true);
    expect(result.personalSavingsPct).toBe(22);
    expect(result.teamSavingsPct).toBe(15);
  });

  it("returns 0 savings for an empty side", () => {
    const onlyPersonal: PlanCardGroup[] = [
      makeGroup({
        key: "p-2",
        context: "personal",
        yearlySavingsPct: 10,
      }),
    ];
    const result = splitPlanGroupsByContext(onlyPersonal);
    expect(result.team).toEqual([]);
    expect(result.teamSavingsPct).toBe(0);
  });
});
