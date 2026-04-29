import type {
  BillingPortalInput,
  CheckoutSessionInput,
  ISubscriptionGateway,
  SubscriptionContext,
} from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";
import { apiFetch, apiFetchVoid } from "./apiClient";
import { applyPriceDefaults, keysToCamel, keysToSnake } from "./caseTransform";
import {
  CheckoutSessionResponseSchema,
  SubscriptionListResponseSchema,
} from "./schemas";

function contextQuery(context: SubscriptionContext | undefined): string {
  // Defense-in-depth: even though the type narrows to a literal union, server
  // actions hand untrusted RPC arguments to this gateway. Only emit the query
  // for values that exactly match the whitelist; drop anything else silently
  // so a tampered payload can't inject extra params or path characters.
  if (context !== "personal" && context !== "team") return "";
  return `?context=${context}`;
}

export class DjangoApiSubscriptionGateway implements ISubscriptionGateway {
  async listSubscriptions(currency?: string): Promise<Subscription[]> {
    const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    const raw = await apiFetch<Record<string, unknown>>(
      `/billing/subscriptions/me/${query}`,
    );
    const camel = keysToCamel(raw) as Record<string, unknown>;
    const results = camel.results;
    if (Array.isArray(results)) {
      for (const row of results) {
        if (row && typeof row === "object") {
          const plan = (row as Record<string, unknown>).plan;
          if (plan && typeof plan === "object") {
            applyPriceDefaults(plan as Record<string, unknown>, currency);
          }
        }
      }
    }
    return SubscriptionListResponseSchema.parse(camel).results;
  }

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<{ url: string }> {
    const raw = await apiFetch<unknown>("/billing/checkout-sessions/", {
      method: "POST",
      body: JSON.stringify(keysToSnake(input)),
    });
    return CheckoutSessionResponseSchema.parse(raw);
  }

  async createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }> {
    const raw = await apiFetch<unknown>("/billing/portal-sessions/", {
      method: "POST",
      body: JSON.stringify(keysToSnake(input)),
    });
    return CheckoutSessionResponseSchema.parse(raw);
  }

  async cancelSubscription(context?: SubscriptionContext): Promise<void> {
    await apiFetchVoid(`/billing/subscriptions/me/${contextQuery(context)}`, {
      method: "DELETE",
    });
  }

  async resumeSubscription(context?: SubscriptionContext): Promise<void> {
    await apiFetchVoid(`/billing/subscriptions/me/${contextQuery(context)}`, {
      method: "PATCH",
      body: JSON.stringify({ cancel_at_period_end: false }),
    });
  }

  async updateSeats(
    quantity: number,
    context?: SubscriptionContext,
  ): Promise<void> {
    await apiFetchVoid(`/billing/subscriptions/me/${contextQuery(context)}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  }
}
