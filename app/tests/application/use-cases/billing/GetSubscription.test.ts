import { describe, it, expect, vi } from "vitest";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import type { ISubscriptionGateway } from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";

const subscription: Subscription = {
  id: "s1",
  stripeId: "sub_123",
  status: "active",
  plan: { id: "p1", name: "Starter", context: "personal", interval: "month" },
  quantity: 1,
  currentPeriodStart: "2024-01-01T00:00:00Z",
  currentPeriodEnd: "2024-02-01T00:00:00Z",
  cancelAtPeriodEnd: false,
  trialEnd: null,
};

function makeGateway(
  overrides?: Partial<ISubscriptionGateway>,
): ISubscriptionGateway {
  return {
    getSubscription: vi.fn().mockResolvedValue(subscription),
    createCheckoutSession: vi.fn(),
    createBillingPortalSession: vi.fn(),
    ...overrides,
  };
}

describe("GetSubscription", () => {
  it("returns the subscription", async () => {
    const gateway = makeGateway();
    const result = await new GetSubscription(gateway).execute("o1");
    expect(result).toEqual(subscription);
    expect(gateway.getSubscription).toHaveBeenCalledWith("o1");
  });

  it("returns null when no subscription exists", async () => {
    const gateway = makeGateway({
      getSubscription: vi.fn().mockResolvedValue(null),
    });
    const result = await new GetSubscription(gateway).execute("o1");
    expect(result).toBeNull();
  });
});
