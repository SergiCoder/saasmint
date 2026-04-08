import type {
  BillingPortalInput,
  CheckoutSessionInput,
  ISubscriptionGateway,
} from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";
import { apiFetch } from "./apiClient";
import { keysToSnake, keysToCamel } from "./caseTransform";

export class DjangoApiSubscriptionGateway implements ISubscriptionGateway {
  async getSubscription(): Promise<Subscription | null> {
    try {
      const raw = await apiFetch<Record<string, unknown>>(
        "/billing/subscription/",
      );
      return keysToCamel<Subscription>(raw);
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
    await apiFetch<void>("/billing/subscription/", { method: "DELETE" });
  }

  async resumeSubscription(): Promise<void> {
    await apiFetch<void>("/billing/subscription/", {
      method: "PATCH",
      body: JSON.stringify({ cancel_at_period_end: false }),
    });
  }
}
