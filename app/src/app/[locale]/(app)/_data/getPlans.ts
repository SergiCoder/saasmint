import { cache } from "react";
import { planGateway } from "@/infrastructure/registry";
import type { Plan } from "@/domain/models/Plan";

/**
 * Fetches the plan catalog for the given currency. The plan catalog is
 * effectively static (changes when product configuration is updated), so
 * deduplicating across layout + page render is the main goal.
 *
 * Returns an empty array on any gateway failure so callers can render a
 * graceful empty state instead of throwing through the page.
 */
export const getPlans = cache(async function getPlans(
  currency?: string,
): Promise<Plan[]> {
  return planGateway.listPlans(currency).catch((err: unknown): Plan[] => {
    console.error("Failed to fetch plans", err);
    return [];
  });
});
