import { cache } from "react";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { subscriptionGateway } from "@/infrastructure/registry";
import type { Subscription } from "@/domain/models/Subscription";

/**
 * Fetches the current user's subscription, returning null when absent.
 * Wrapped with React.cache() so that layout + page share a single API call
 * per server render pass.
 */
export const getSubscription = cache(async function getSubscription(
  currency?: string,
): Promise<Subscription | null> {
  return new GetSubscription(subscriptionGateway)
    .execute(currency)
    .catch(() => null);
});
