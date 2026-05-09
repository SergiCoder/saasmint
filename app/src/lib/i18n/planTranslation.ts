import type { Plan } from "@/domain/models/Plan";

/**
 * Documented union of dynamic message keys read by translatePlanName /
 * buildPlanTranslations. The translator parameter type uses `never` because
 * next-intl's typed translator narrows keys to the literal union derived
 * from the messages JSON; matching the narrow type at the call-site would
 * require knowing the namespace at compile time. Listing the actual
 * runtime keys here makes the contract visible even though the function
 * signature stays at `(key: never)`.
 */
export type DynamicPlanKey =
  | `${"personal" | "team"}.1.name`
  | `${"personal" | "team"}.1.description`
  | `${"personal" | "team"}.2.name`
  | `${"personal" | "team"}.2.description`
  | `${"personal" | "team"}.3.name`
  | `${"personal" | "team"}.3.description`;

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
 * required. The set of keys this helper actually issues is documented in
 * {@link DynamicPlanKey} above.
 */
export function translatePlanName(
  tPlans: (key: never) => string,
  plan: Pick<Plan, "context" | "tier">,
): string {
  return tPlans(`${plan.context}.${plan.tier}.name` as never);
}
