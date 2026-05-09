import type { IPlanGateway } from "@/application/ports/IPlanGateway";
import type { Plan } from "@/domain/models/Plan";
import { apiFetchOptional } from "./apiClient";
import { keysToCamelWithPrice } from "./caseTransform";
import { parsePaginated } from "./parsers";
import { PlanSchema } from "./schemas";

function parsePlan(raw: Record<string, unknown>, currency?: string): Plan {
  return PlanSchema.parse(keysToCamelWithPrice(raw, currency));
}

// Plan catalog is effectively static — refreshed only when product config or
// Stripe pricing changes. Cache the upstream response in Next.js's data cache
// for 1h so unrelated requests across the cluster share the result instead of
// hammering Django on every nav (`React.cache` only deduplicates within a
// single render). Currency lives in the URL, so different currencies get
// distinct cache entries automatically.
const PLAN_CACHE_TTL_SECONDS = 60 * 60;

export class DjangoApiPlanGateway implements IPlanGateway {
  async listPlans(currency?: string): Promise<Plan[]> {
    const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    const data = await apiFetchOptional<Record<string, unknown>>(
      `/billing/plans/${query}`,
      { next: { revalidate: PLAN_CACHE_TTL_SECONDS } },
    );
    return parsePaginated(data, (r) => parsePlan(r, currency));
  }
}
