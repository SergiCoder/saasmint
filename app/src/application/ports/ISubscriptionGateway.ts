import type { Subscription } from "@/domain/models/Subscription";

export interface CheckoutSessionInput {
  planPriceId: string;
  /** Team-only: purchased seat count. Renamed from `quantity` in backend v0.8.0. */
  seatLimit?: number;
  orgName?: string;
  /**
   * Team-context only: when the caller has an active personal subscription,
   * `true` keeps it running concurrently; `false` (default) auto-sets it to
   * cancel at period end once the team checkout completes.
   */
  keepPersonalSubscription?: boolean;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingPortalInput {
  returnUrl: string;
  /**
   * Concurrent billers (rule 5) MUST pin which Stripe customer the portal
   * session attaches to — without it the backend defaults ("team" for org
   * members, otherwise "personal") would silently route the team owner's
   * "manage personal" click into the team customer's portal. Single-context
   * callers can omit it.
   */
  context?: SubscriptionContext;
}

/**
 * Targets one of the caller's two possible subscriptions when concurrent
 * personal+team billing is in effect. Omitted on backend defaults to `team`
 * for org members and `personal` otherwise — single-sub callers don't need
 * to pass it.
 */
export type SubscriptionContext = "personal" | "team";

export interface ISubscriptionGateway {
  /**
   * Backend returns a paginated envelope; the gateway unwraps to the rows.
   * 0 rows for free-tier users (replaces the prior 404), 1 for single-sub
   * users, up to 2 for concurrent personal+team (rule 5).
   */
  listSubscriptions(currency?: string): Promise<Subscription[]>;
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }>;
  createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }>;
  /**
   * PATCH /billing/subscriptions/me/ with `{ plan_price_id }`. Backend
   * applies upgrades/same-amount switches immediately and defers downgrades
   * to period end (returns the sub with `scheduledPlan` + `scheduledChangeAt`
   * set). Throws `ApiError(409, code="already_on_plan")` when the target
   * matches the current price.
   */
  changePlan(
    planPriceId: string,
    context?: SubscriptionContext,
  ): Promise<Subscription>;
  /** Schedule the subscription to cancel at the end of the current period. */
  cancelSubscription(context?: SubscriptionContext): Promise<void>;
  /** Undo a pending cancellation so the subscription renews normally. */
  resumeSubscription(context?: SubscriptionContext): Promise<void>;
  /**
   * Release a pending deferred plan change (downgrade scheduled at period
   * end) so the current plan continues. Idempotent — safe when no schedule
   * exists. Both `?context=` resolution and is_billing checks mirror the
   * other mutating subscription endpoints.
   */
  releaseScheduledChange(context?: SubscriptionContext): Promise<void>;
  /** Update the purchased seat count on a team subscription. */
  updateSeats(seatLimit: number, context?: SubscriptionContext): Promise<void>;
}
