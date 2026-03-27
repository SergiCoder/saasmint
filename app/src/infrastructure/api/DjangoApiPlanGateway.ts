import type { IPlanGateway } from "@/application/ports/IPlanGateway";
import type { Plan } from "@/domain/models/Plan";
import { apiFetch, getAuthToken } from "./apiClient";

export class DjangoApiPlanGateway implements IPlanGateway {
  async listPlans(): Promise<Plan[]> {
    const token = await getAuthToken();
    return apiFetch<Plan[]>("/billing/plans/", token);
  }
}
