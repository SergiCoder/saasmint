import type { Plan } from "@/domain/models/Plan";

export interface IPlanGateway {
  listPlans(currency?: string): Promise<Plan[]>;
}
