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

export interface Subscription {
  readonly id: string;
  readonly status: SubscriptionStatus;
  readonly plan: Plan;
  /**
   * Purchased seat capacity. Personal subs always 1; team subs are the
   * count the billing member paid for. Authoritative source for the seat
   * cap — frontend no longer hard-codes a constant. Renamed from
   * `quantity` in backend v0.8.0 (DB column `seat_limit`).
   */
  readonly seatLimit: number;
  /**
   * Seats currently in use. Personal subs always 1 (the owning user);
   * team subs count accepted `OrgMember` rows on the org tied to the
   * sub's Stripe customer (pending invitations don't count). Always at
   * least 1.
   */
  readonly seatsUsed: number;
  readonly trialEndsAt: string | null;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  /**
   * Scheduled cutover for a "cancel at period end" — set the moment the
   * caller hits cancel-renewal, cleared if they resume. Distinct from
   * `canceledAt`, which only flips when the sub has actually ended. An
   * active sub with `cancelAt !== null` is the "scheduled to cancel" state.
   */
  readonly cancelAt: string | null;
  readonly canceledAt: string | null;
  /**
   * Pending plan change deferred to period end (downgrade Pro→Basic etc.).
   * Set together with `scheduledChangeAt`; both are cleared when the user
   * releases the schedule via
   * `DELETE /billing/subscriptions/me/scheduled-change/` (with optional
   * `?context=` query) or it applies at `current_period_end`. Upgrades apply
   * immediately and never populate this.
   */
  readonly scheduledPlan: Plan | null;
  readonly scheduledChangeAt: string | null;
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
