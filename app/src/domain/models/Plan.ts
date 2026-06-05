import type { Price } from "./Price";

export type PlanTier = 1 | 2 | 3;

export const PLAN_TIER_FREE: PlanTier = 1;
export const PLAN_TIER_BASIC: PlanTier = 2;
export const PLAN_TIER_PRO: PlanTier = 3;

export interface Plan {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly context: "personal" | "team";
  readonly tier: PlanTier;
  readonly interval: "month" | "year";
  readonly price: Price | null;
}
