import type { IPlanGateway } from "@/application/ports/IPlanGateway";
import type { Plan } from "@/domain/models/Plan";
import { AuthError } from "@/domain/errors/AuthError";
import { getAccessToken } from "@/infrastructure/auth/cookies";
import { apiFetch, publicApiFetch } from "./apiClient";
import { keysToCamelWithPrice } from "./caseTransform";

export class DjangoApiPlanGateway implements IPlanGateway {
  async listPlans(currency?: string): Promise<Plan[]> {
    const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    let raw: Record<string, unknown>[];
    if (await getAccessToken()) {
      try {
        raw = await apiFetch<Record<string, unknown>[]>(
          `/billing/plans/${query}`,
        );
      } catch (err) {
        if (err instanceof AuthError) {
          raw = await publicApiFetch<Record<string, unknown>[]>(
            `/billing/plans/${query}`,
          );
        } else {
          throw err;
        }
      }
    } else {
      raw = await publicApiFetch<Record<string, unknown>[]>(
        `/billing/plans/${query}`,
      );
    }
    return raw.map((r) => keysToCamelWithPrice<Plan>(r, currency));
  }
}
