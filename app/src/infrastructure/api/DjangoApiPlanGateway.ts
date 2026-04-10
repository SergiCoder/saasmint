import type { IPlanGateway } from "@/application/ports/IPlanGateway";
import type { Plan } from "@/domain/models/Plan";
import { publicApiFetch } from "./apiClient";
import { keysToCamelWithPrice } from "./caseTransform";

export class DjangoApiPlanGateway implements IPlanGateway {
  async listPlans(currency?: string): Promise<Plan[]> {
    const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    const raw = await publicApiFetch<Record<string, unknown>[]>(
      `/billing/plans/${query}`,
    );
    return raw.map(keysToCamelWithPrice<Plan>);
  }
}
