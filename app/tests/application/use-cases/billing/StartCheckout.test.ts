import { describe, it, expect, vi } from "vitest";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import type { ISubscriptionGateway } from "@/application/ports/ISubscriptionGateway";

function makeGateway(
  overrides?: Partial<ISubscriptionGateway>,
): ISubscriptionGateway {
  return {
    getSubscription: vi.fn(),
    createCheckoutSession: vi
      .fn()
      .mockResolvedValue({ url: "https://checkout.stripe.com/session_123" }),
    createBillingPortalSession: vi.fn(),
    ...overrides,
  };
}

describe("StartCheckout", () => {
  it("returns checkout URL for personal plan", async () => {
    const gateway = makeGateway();
    const input = { planPriceId: "price_abc" };
    const result = await new StartCheckout(gateway).execute(input);
    expect(result.url).toBe("https://checkout.stripe.com/session_123");
    expect(gateway.createCheckoutSession).toHaveBeenCalledWith(input);
  });

  it("passes orgId when provided", async () => {
    const gateway = makeGateway();
    const input = { planPriceId: "price_abc", orgId: "o1" };
    await new StartCheckout(gateway).execute(input);
    expect(gateway.createCheckoutSession).toHaveBeenCalledWith(input);
  });
});
