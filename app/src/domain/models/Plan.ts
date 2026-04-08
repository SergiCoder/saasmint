import type { PlanPrice } from "./PlanPrice";

export type PlanTier = "free" | "basic" | "pro";

export interface Plan {
  id: string;
  name: string;
  description: string;
  context: "personal" | "team";
  tier: PlanTier;
  interval: "month" | "year";
  price: PlanPrice | null;
}
