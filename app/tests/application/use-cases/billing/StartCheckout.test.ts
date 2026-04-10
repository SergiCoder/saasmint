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
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    ...overrides,
  };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

describe("StartCheckout", () => {
  it("returns checkout URL", async () => {
    const gateway = makeGateway();
    const input = {
      planPriceId: "price_abc",
      successUrl: `${APP_URL}/billing?status=success`,
      cancelUrl: `${APP_URL}/billing`,
    };
    const result = await new StartCheckout(gateway).execute(input);
    expect(result.url).toBe("https://checkout.stripe.com/session_123");
    expect(gateway.createCheckoutSession).toHaveBeenCalledWith(input);
  });
});
