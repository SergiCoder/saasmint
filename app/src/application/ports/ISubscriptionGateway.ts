import type { Subscription } from "@/domain/models/Subscription";

export interface CheckoutSessionInput {
  planPriceId: string;
  orgId?: string;
}

export interface BillingPortalInput {
  orgId?: string;
}

export interface ISubscriptionGateway {
  getSubscription(orgId: string): Promise<Subscription | null>;
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }>;
  createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }>;
}
