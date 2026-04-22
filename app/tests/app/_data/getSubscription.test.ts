import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSubscription = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  subscriptionGateway: {
    getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
  },
}));

let getSubscription: typeof import("@/app/[locale]/(app)/_data/getSubscription").getSubscription;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/(app)/_data/getSubscription");
  getSubscription = mod.getSubscription;
});

describe("getSubscription", () => {
  it("returns the subscription resolved by the gateway", async () => {
    const subscription = {
      id: "sub_1",
      status: "active",
      plan: { context: "personal" },
    };
    mockGetSubscription.mockResolvedValue(subscription);

    const result = await getSubscription("usd");

    expect(mockGetSubscription).toHaveBeenCalledWith("usd");
    expect(result).toBe(subscription);
  });

  it("passes undefined when no currency is provided", async () => {
    mockGetSubscription.mockResolvedValue(null);

    await getSubscription();

    expect(mockGetSubscription).toHaveBeenCalledWith(undefined);
  });

  it("returns null when the gateway throws", async () => {
    mockGetSubscription.mockRejectedValue(new Error("API 500"));

    const result = await getSubscription("usd");

    expect(result).toBeNull();
  });

  it("returns null when the gateway resolves with null", async () => {
    mockGetSubscription.mockResolvedValue(null);

    const result = await getSubscription();

    expect(result).toBeNull();
  });
});
