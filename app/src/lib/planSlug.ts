/**
 * Single source of truth for the plan-slug shape accepted by the signup,
 * checkout, and verify-email flows. Validating both at write time (in the
 * server action) and at read time (in the cookie consumer) is defense in
 * depth: even with httpOnly cookies, a junk value reaching URL construction
 * must not propagate.
 */
export const PLAN_SLUG_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidPlanSlug(value: unknown): value is string {
  return typeof value === "string" && PLAN_SLUG_RE.test(value);
}
