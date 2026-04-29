import type { Subscription } from "@/domain/models/Subscription";

export interface CheckoutSessionInput {
  planPriceId: string;
  quantity?: number;
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
  /** Schedule the subscription to cancel at the end of the current period. */
  cancelSubscription(context?: SubscriptionContext): Promise<void>;
  /** Undo a pending cancellation so the subscription renews normally. */
  resumeSubscription(context?: SubscriptionContext): Promise<void>;
  /** Update the seat count on a team subscription. */
  updateSeats(quantity: number, context?: SubscriptionContext): Promise<void>;
}
