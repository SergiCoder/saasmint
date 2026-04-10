import type { Plan } from "@/domain/models/Plan";
import type { IPlanGateway } from "@/application/ports/IPlanGateway";

export class ListPlans {
  constructor(private readonly plans: IPlanGateway) {}

  async execute(currency?: string): Promise<Plan[]> {
    return this.plans.listPlans(currency);
  }
}
