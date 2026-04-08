import type { IPlanGateway } from "@/application/ports/IPlanGateway";
import type { Plan } from "@/domain/models/Plan";
import { publicApiFetch } from "./apiClient";

export class DjangoApiPlanGateway implements IPlanGateway {
  async listPlans(): Promise<Plan[]> {
    return publicApiFetch<Plan[]>("/billing/plans/");
  }
}
