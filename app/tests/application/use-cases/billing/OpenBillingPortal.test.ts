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
    ...overrides,
  };
}

describe("OpenBillingPortal", () => {
  it("returns billing portal URL", async () => {
    const gateway = makeGateway();
    const result = await new OpenBillingPortal(gateway).execute({});
    expect(result.url).toBe("https://billing.stripe.com/portal_123");
    expect(gateway.createBillingPortalSession).toHaveBeenCalledWith({});
  });

  it("passes orgId when provided", async () => {
    const gateway = makeGateway();
    const input = { orgId: "o1" };
    await new OpenBillingPortal(gateway).execute(input);
    expect(gateway.createBillingPortalSession).toHaveBeenCalledWith(input);
  });
});
