import type { Subscription } from "@/domain/models/Subscription";

export interface CheckoutSessionInput {
  planPriceId: string;
  quantity?: number;
  orgName?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingPortalInput {
  returnUrl: string;
}

export interface ISubscriptionGateway {
  getSubscription(currency?: string): Promise<Subscription | null>;
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }>;
  createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }>;
  /** Schedule the subscription to cancel at the end of the current period. */
  cancelSubscription(): Promise<void>;
  /** Undo a pending cancellation so the subscription renews normally. */
  resumeSubscription(): Promise<void>;
  /** Update the seat count on a team subscription. */
  updateSeats(quantity: number): Promise<void>;
}
