import type {
  BillingPortalInput,
  CheckoutSessionInput,
  ISubscriptionGateway,
} from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";
import { apiFetch } from "./apiClient";
import {
  keysToSnake,
  keysToCamel,
  keysToCamelWithPrice,
} from "./caseTransform";

export class DjangoApiSubscriptionGateway implements ISubscriptionGateway {
  async getSubscription(currency?: string): Promise<Subscription | null> {
    try {
      const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
      const raw = await apiFetch<Record<string, unknown>>(
        `/billing/subscriptions/me/${query}`,
      );
      const sub = keysToCamel<Subscription>(raw);
      if (raw.plan && typeof raw.plan === "object") {
        sub.plan = keysToCamelWithPrice<Subscription["plan"]>(
          raw.plan as Record<string, unknown>,
          currency,
        );
      }
      return sub;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("API 404"))
        return null;
      throw err;
    }
  }

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<{ url: string }> {
    return apiFetch<{ url: string }>("/billing/checkout-sessions/", {
      method: "POST",
      body: JSON.stringify(keysToSnake(input)),
    });
  }

  async createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }> {
    return apiFetch<{ url: string }>("/billing/portal-sessions/", {
      method: "POST",
      body: JSON.stringify(keysToSnake(input)),
    });
  }

  async cancelSubscription(): Promise<void> {
    await apiFetch<void>("/billing/subscriptions/me/", { method: "DELETE" });
  }

  async resumeSubscription(): Promise<void> {
    await apiFetch<void>("/billing/subscriptions/me/", {
      method: "PATCH",
      body: JSON.stringify({ cancel_at_period_end: false }),
    });
  }

  async updateSeats(quantity: number): Promise<void> {
    await apiFetch<void>("/billing/subscriptions/me/", {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  }
}
