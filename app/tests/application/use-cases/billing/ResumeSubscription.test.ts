import { describe, it, expect, vi } from "vitest";
import { ResumeSubscription } from "@/application/use-cases/billing/ResumeSubscription";
import type { ISubscriptionGateway } from "@/application/ports/ISubscriptionGateway";

function makeGateway(
  overrides?: Partial<ISubscriptionGateway>,
): ISubscriptionGateway {
  return {
    getSubscription: vi.fn(),
    createCheckoutSession: vi.fn(),
    createBillingPortalSession: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn().mockResolvedValue(undefined),
    updateSeats: vi.fn(),
    ...overrides,
  };
}

describe("ResumeSubscription", () => {
  it("delegates to the gateway", async () => {
    const gateway = makeGateway();
    await new ResumeSubscription(gateway).execute();
    expect(gateway.resumeSubscription).toHaveBeenCalledOnce();
  });

  it("propagates gateway errors", async () => {
    const gateway = makeGateway({
      resumeSubscription: vi.fn().mockRejectedValue(new Error("boom")),
    });
    await expect(new ResumeSubscription(gateway).execute()).rejects.toThrow(
      "boom",
    );
  });
});
