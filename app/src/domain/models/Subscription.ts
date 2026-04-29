import type { Plan } from "./Plan";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

/** Maximum number of seats allowed on a team subscription. */
export const MAX_SEATS = 100;

export interface Subscription {
  readonly id: string;
  readonly status: SubscriptionStatus;
  readonly plan: Plan;
  readonly quantity: number;
  readonly trialEndsAt: string | null;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly canceledAt: string | null;
  readonly createdAt: string;
}

/**
 * `GET /billing/subscriptions/me/` returns up to two rows (rule 5: concurrent
 * personal+team is allowed). These selectors pick the row that matches the
 * caller's context. `null` when no row of that context exists.
 */
export function findPersonalSubscription(
  subscriptions: readonly Subscription[],
): Subscription | null {
  return subscriptions.find((s) => s.plan.context === "personal") ?? null;
}

export function findTeamSubscription(
  subscriptions: readonly Subscription[],
): Subscription | null {
  return subscriptions.find((s) => s.plan.context === "team") ?? null;
}
