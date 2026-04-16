import { describe, it, expect, vi } from "vitest";
import { UpdateSeats } from "@/application/use-cases/billing/UpdateSeats";
import type { ISubscriptionGateway } from "@/application/ports/ISubscriptionGateway";

function makeGateway(
  overrides?: Partial<ISubscriptionGateway>,
): ISubscriptionGateway {
  return {
    getSubscription: vi.fn(),
    createCheckoutSession: vi.fn(),
    createBillingPortalSession: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    updateSeats: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("UpdateSeats", () => {
  it("delegates to the gateway with the given quantity", async () => {
    const gateway = makeGateway();
    await new UpdateSeats(gateway).execute(5);
    expect(gateway.updateSeats).toHaveBeenCalledWith(5);
  });

  it("propagates gateway errors", async () => {
    const gateway = makeGateway({
      updateSeats: vi.fn().mockRejectedValue(new Error("boom")),
    });
    await expect(new UpdateSeats(gateway).execute(5)).rejects.toThrow("boom");
  });
});
