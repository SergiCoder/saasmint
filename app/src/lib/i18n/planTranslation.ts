import type { Plan } from "@/domain/models/Plan";

/**
 * next-intl's typed translator narrows keys to the literal union derived from
 * the messages JSON, which can't represent keys built from runtime data
 * (`${context}.${tier}.name`). This helper localises the `as never` cast so
 * callers don't sprinkle it across pages. Missing translations still surface
 * at runtime as next-intl's `MISSING_MESSAGE`.
 *
 * Parameter type `(key: never) => string` is assignable from any typed
 * translator — `never` is the bottom type, so a function that accepts a
 * specific literal union is assignable where one accepting `never` is
 * required.
 */
export function translatePlanName(
  tPlans: (key: never) => string,
  plan: Pick<Plan, "context" | "tier">,
): string {
  return tPlans(`${plan.context}.${plan.tier}.name` as never);
}
