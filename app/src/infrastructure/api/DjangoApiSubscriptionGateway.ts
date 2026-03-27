import type {
  BillingPortalInput,
  CheckoutSessionInput,
  ISubscriptionGateway,
} from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";
import { apiFetch, getAuthToken } from "./apiClient";

export class DjangoApiSubscriptionGateway implements ISubscriptionGateway {
  async getSubscription(_orgId: string): Promise<Subscription | null> {
    const token = await getAuthToken();
    try {
      return await apiFetch<Subscription>("/billing/subscription/", token);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("API 404"))
        return null;
      throw err;
    }
  }

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<{ url: string }> {
    const token = await getAuthToken();
    return apiFetch<{ url: string }>("/billing/checkout/", token, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }> {
    const token = await getAuthToken();
    return apiFetch<{ url: string }>("/billing/portal/", token, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}
