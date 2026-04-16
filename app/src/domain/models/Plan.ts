import type { PlanPrice } from "./PlanPrice";

export type PlanTier = 1 | 2 | 3;

export const PLAN_TIER_FREE: PlanTier = 1;
export const PLAN_TIER_BASIC: PlanTier = 2;
export const PLAN_TIER_PRO: PlanTier = 3;

export interface Plan {
  id: string;
  name: string;
  description: string;
  context: "personal" | "team";
  tier: PlanTier;
  interval: "month" | "year";
  price: PlanPrice | null;
}
