import type { IPlanGateway } from "@/application/ports/IPlanGateway";
import type { Plan } from "@/domain/models/Plan";
import { apiFetchOptional } from "./apiClient";
import { keysToCamelWithPrice } from "./caseTransform";
import { PlanSchema } from "./schemas";

function parsePlan(raw: Record<string, unknown>, currency?: string): Plan {
  return PlanSchema.parse(keysToCamelWithPrice(raw, currency));
}

export class DjangoApiPlanGateway implements IPlanGateway {
  async listPlans(currency?: string): Promise<Plan[]> {
    const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    const data = await apiFetchOptional<{ results: Record<string, unknown>[] }>(
      `/billing/plans/${query}`,
    );
    return data.results.map((r) => parsePlan(r, currency));
  }
}
