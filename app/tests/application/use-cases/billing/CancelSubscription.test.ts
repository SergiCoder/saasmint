import { describe, it, expect, vi } from "vitest";
import { CancelSubscription } from "@/application/use-cases/billing/CancelSubscription";
import type { ISubscriptionGateway } from "@/application/ports/ISubscriptionGateway";

function makeGateway(
  overrides?: Partial<ISubscriptionGateway>,
): ISubscriptionGateway {
  return {
    getSubscription: vi.fn(),
    createCheckoutSession: vi.fn(),
    createBillingPortalSession: vi.fn(),
    cancelSubscription: vi.fn().mockResolvedValue(undefined),
    resumeSubscription: vi.fn(),
    updateSeats: vi.fn(),
    ...overrides,
  };
}

describe("CancelSubscription", () => {
  it("delegates to the gateway", async () => {
    const gateway = makeGateway();
    await new CancelSubscription(gateway).execute();
    expect(gateway.cancelSubscription).toHaveBeenCalledOnce();
  });

  it("propagates gateway errors", async () => {
    const gateway = makeGateway({
      cancelSubscription: vi.fn().mockRejectedValue(new Error("boom")),
    });
    await expect(new CancelSubscription(gateway).execute()).rejects.toThrow(
      "boom",
    );
  });
});
