import type { Plan } from "@/domain/models/Plan";

export interface IPlanGateway {
  listPlans(): Promise<Plan[]>;
}
