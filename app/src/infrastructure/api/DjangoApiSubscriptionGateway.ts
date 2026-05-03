import type {
  BillingPortalInput,
  CheckoutSessionInput,
  ISubscriptionGateway,
  SubscriptionContext,
} from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";
import { apiFetch, apiFetchVoid } from "./apiClient";
import { applyPriceDefaults, keysToCamel, keysToSnake } from "./caseTransform";
import { contextQuery } from "./contextQuery";
import {
  CheckoutSessionResponseSchema,
  SubscriptionListResponseSchema,
  SubscriptionSchema,
} from "./schemas";

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
          const record = row as Record<string, unknown>;
          const plan = record.plan;
          if (plan && typeof plan === "object") {
            applyPriceDefaults(plan as Record<string, unknown>, currency);
          }
          const scheduledPlan = record.scheduledPlan;
          if (scheduledPlan && typeof scheduledPlan === "object") {
            applyPriceDefaults(
              scheduledPlan as Record<string, unknown>,
              currency,
            );
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
    const { context, ...body } = input;
    const raw = await apiFetch<unknown>(
      `/billing/portal-sessions/${contextQuery(context)}`,
      {
        method: "POST",
        body: JSON.stringify(keysToSnake(body)),
      },
    );
    return CheckoutSessionResponseSchema.parse(raw);
  }

  async changePlan(
    planPriceId: string,
    context?: SubscriptionContext,
  ): Promise<Subscription> {
    const raw = await apiFetch<Record<string, unknown>>(
      `/billing/subscriptions/me/${contextQuery(context)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ plan_price_id: planPriceId }),
      },
    );
    const camel = keysToCamel(raw) as Record<string, unknown>;
    const plan = camel.plan;
    if (plan && typeof plan === "object") {
      applyPriceDefaults(plan as Record<string, unknown>);
    }
    const scheduledPlan = camel.scheduledPlan;
    if (scheduledPlan && typeof scheduledPlan === "object") {
      applyPriceDefaults(scheduledPlan as Record<string, unknown>);
    }
    return SubscriptionSchema.parse(camel);
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

  async releaseScheduledChange(context?: SubscriptionContext): Promise<void> {
    await apiFetchVoid(
      `/billing/subscriptions/me/scheduled-change/${contextQuery(context)}`,
      { method: "DELETE" },
    );
  }

  async updateSeats(
    seatLimit: number,
    context?: SubscriptionContext,
  ): Promise<void> {
    await apiFetchVoid(`/billing/subscriptions/me/${contextQuery(context)}`, {
      method: "PATCH",
      body: JSON.stringify({ seat_limit: seatLimit }),
    });
  }
}
