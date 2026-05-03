import type { Product } from "@/domain/models/Product";
import type { SubscriptionContext } from "./ISubscriptionGateway";

export interface ProductCheckoutInput {
  productPriceId: string;
  successUrl: string;
  cancelUrl: string;
  /**
   * Disambiguates which Stripe customer to charge when the caller is an org
   * owner who kept their personal subscription alongside the team plan
   * (rule 5b). Omitted on backend defaults to `team` for org members and
   * `personal` otherwise; single-context callers don't need to pass it.
   */
  context?: SubscriptionContext;
}

export interface IProductGateway {
  listProducts(currency?: string): Promise<Product[]>;
  createCheckoutSession(input: ProductCheckoutInput): Promise<{ url: string }>;
}
