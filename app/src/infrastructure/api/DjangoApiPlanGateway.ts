import type { IPlanGateway } from "@/application/ports/IPlanGateway";
import type { Plan } from "@/domain/models/Plan";
import { apiFetch } from "./apiClient";

export class DjangoApiPlanGateway implements IPlanGateway {
  async listPlans(): Promise<Plan[]> {
    return apiFetch<Plan[]>("/billing/plans/");
  }
}
