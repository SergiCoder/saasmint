import { describe, it, expect, vi } from "vitest";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import type { ISubscriptionGateway } from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";

const subscription: Subscription = {
  id: "s1",
  status: "active",
  plan: {
    id: "p1",
    name: "Pro",
    description: "Pro plan",
    context: "personal",
    tier: 3,
    interval: "month",
    price: { id: "pp1", amount: 1900, displayAmount: 19.0, currency: "usd" },
  },
  quantity: 1,
  trialEndsAt: null,
  currentPeriodStart: "2024-01-01T00:00:00Z",
  currentPeriodEnd: "2024-02-01T00:00:00Z",
  canceledAt: null,
  createdAt: "2024-01-01T00:00:00Z",
};

function makeGateway(
  overrides?: Partial<ISubscriptionGateway>,
): ISubscriptionGateway {
  return {
    getSubscription: vi.fn().mockResolvedValue(subscription),
    createCheckoutSession: vi.fn(),
    createBillingPortalSession: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    updateSeats: vi.fn(),
    ...overrides,
  };
}

describe("GetSubscription", () => {
  it("returns the subscription", async () => {
    const gateway = makeGateway();
    const result = await new GetSubscription(gateway).execute();
    expect(result).toEqual(subscription);
    expect(gateway.getSubscription).toHaveBeenCalledOnce();
  });

  it("returns null when no subscription exists", async () => {
    const gateway = makeGateway({
      getSubscription: vi.fn().mockResolvedValue(null),
    });
    const result = await new GetSubscription(gateway).execute();
    expect(result).toBeNull();
  });
});
