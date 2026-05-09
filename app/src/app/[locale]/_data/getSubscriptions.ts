import { cache } from "react";
import { subscriptionGateway } from "@/infrastructure/registry";
import type { Subscription } from "@/domain/models/Subscription";

/**
 * Fetches the current user's subscriptions, returning an empty array on any
 * gateway failure or when the user has no rows (free tier). The result holds
 * 0–2 rows (free tier, single sub, or concurrent personal+team — rule 5).
 *
 * Wrapped with React.cache() so a layout and its pages share a single API
 * call per server render pass.
 */
export const getSubscriptions = cache(async function getSubscriptions(
  currency?: string,
): Promise<Subscription[]> {
  return subscriptionGateway.listSubscriptions(currency).catch(() => []);
});
