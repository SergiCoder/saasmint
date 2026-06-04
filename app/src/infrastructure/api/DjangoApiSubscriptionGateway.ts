import type {
  BillingPortalInput,
  CheckoutSessionInput,
  ISubscriptionGateway,
  SubscriptionContext,
} from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";
import { isRecord } from "@/lib/typeGuards";
import { apiFetch, apiFetchVoid } from "./apiClient";
import { applyPriceDefaults, keysToCamel, keysToSnake } from "./caseTransform";
import { contextQuery } from "./contextQuery";
import { parsePaginated } from "./parsers";
import { CheckoutSessionResponseSchema, SubscriptionSchema } from "./schemas";

/**
 * Apply price defaults to a subscription's nested `plan` and `scheduledPlan`
 * shapes. `keysToCamelWithPrice` was designed for flat plan/product objects;
 * subscriptions wrap their plan one level deeper, so this helper consolidates
 * the manual walk used by `listSubscriptions` and `changePlan`.
 */
function applySubscriptionPriceDefaults(
  sub: Record<string, unknown>,
  currency?: string,
): void {
  if (isRecord(sub.plan)) applyPriceDefaults(sub.plan, currency);
  if (isRecord(sub.scheduledPlan)) {
    applyPriceDefaults(sub.scheduledPlan, currency);
  }
}

export class DjangoApiSubscriptionGateway implements ISubscriptionGateway {
  async listSubscriptions(currency?: string): Promise<Subscription[]> {
    const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    const raw = await apiFetch(`/billing/subscriptions/me/${query}`);
    return parsePaginated(keysToCamel(raw), (row) => {
      applySubscriptionPriceDefaults(row, currency);
      return SubscriptionSchema.parse(row);
    });
  }

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<{ url: string }> {
    const raw = await apiFetch("/billing/checkout-sessions/", {
      method: "POST",
      body: JSON.stringify(keysToSnake(input)),
    });
    return CheckoutSessionResponseSchema.parse(raw);
  }

  async createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }> {
    const { context, ...body } = input;
    const raw = await apiFetch(
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
    const raw = await apiFetch(
      `/billing/subscriptions/me/${contextQuery(context)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ plan_price_id: planPriceId }),
      },
    );
    const camel = keysToCamel(raw);
    if (isRecord(camel)) applySubscriptionPriceDefaults(camel);
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
