import type {
  BillingPortalInput,
  CheckoutSessionInput,
  ISubscriptionGateway,
} from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";
import { apiFetch } from "./apiClient";

export class DjangoApiSubscriptionGateway implements ISubscriptionGateway {
  async getSubscription(_orgId: string): Promise<Subscription | null> {
    try {
      return await apiFetch<Subscription>("/billing/subscription/");
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("API 404"))
        return null;
      throw err;
    }
  }

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<{ url: string }> {
    return apiFetch<{ url: string }>("/billing/checkout/", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }> {
    return apiFetch<{ url: string }>("/billing/portal/", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}
