import type { PlanPrice } from "./PlanPrice";

export interface Plan {
  id: string;
  name: string;
  context: "personal" | "team";
  interval: "month" | "year";
  isActive: boolean;
  prices: PlanPrice[];
}
