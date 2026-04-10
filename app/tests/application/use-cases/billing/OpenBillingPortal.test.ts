import { describe, it, expect, vi } from "vitest";
import { OpenBillingPortal } from "@/application/use-cases/billing/OpenBillingPortal";
import type { ISubscriptionGateway } from "@/application/ports/ISubscriptionGateway";

function makeGateway(
  overrides?: Partial<ISubscriptionGateway>,
): ISubscriptionGateway {
  return {
    getSubscription: vi.fn(),
    createCheckoutSession: vi.fn(),
    createBillingPortalSession: vi
      .fn()
      .mockResolvedValue({ url: "https://billing.stripe.com/portal_123" }),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    ...overrides,
  };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

describe("OpenBillingPortal", () => {
  it("returns billing portal URL", async () => {
    const gateway = makeGateway();
    const input = { returnUrl: `${APP_URL}/billing` };
    const result = await new OpenBillingPortal(gateway).execute(input);
    expect(result.url).toBe("https://billing.stripe.com/portal_123");
    expect(gateway.createBillingPortalSession).toHaveBeenCalledWith(input);
  });
});
