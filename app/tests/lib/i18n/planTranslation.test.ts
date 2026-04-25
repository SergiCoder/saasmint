import { describe, it, expect, vi } from "vitest";
import { translatePlanName } from "@/lib/i18n/planTranslation";

describe("translatePlanName", () => {
  it("builds a `${context}.${tier}.name` key for personal plans", () => {
    const tPlans = vi.fn((key: string) => `translated:${key}`) as unknown as (
      key: never,
    ) => string;

    const result = translatePlanName(tPlans, { context: "personal", tier: 1 });

    expect(tPlans).toHaveBeenCalledWith("personal.1.name");
    expect(result).toBe("translated:personal.1.name");
  });

  it("builds a `${context}.${tier}.name` key for team plans", () => {
    const tPlans = vi.fn((key: string) => `translated:${key}`) as unknown as (
      key: never,
    ) => string;

    const result = translatePlanName(tPlans, { context: "team", tier: 3 });

    expect(tPlans).toHaveBeenCalledWith("team.3.name");
    expect(result).toBe("translated:team.3.name");
  });

  it("returns the raw translator output for every supported tier", () => {
    const tPlans = ((key: string) => key) as unknown as (key: never) => string;

    expect(translatePlanName(tPlans, { context: "personal", tier: 1 })).toBe(
      "personal.1.name",
    );
    expect(translatePlanName(tPlans, { context: "personal", tier: 2 })).toBe(
      "personal.2.name",
    );
    expect(translatePlanName(tPlans, { context: "team", tier: 2 })).toBe(
      "team.2.name",
    );
  });
});
