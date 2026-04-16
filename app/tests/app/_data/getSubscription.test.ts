import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSubscriptionExecute = vi.fn();
vi.mock("@/application/use-cases/billing/GetSubscription", () => ({
  GetSubscription: function GetSubscription() {
    return { execute: mockGetSubscriptionExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  subscriptionGateway: {},
}));

let getSubscription: typeof import("@/app/[locale]/(app)/_data/getSubscription").getSubscription;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/(app)/_data/getSubscription");
  getSubscription = mod.getSubscription;
});

describe("getSubscription", () => {
  it("returns the subscription resolved by the use-case", async () => {
    const subscription = {
      id: "sub_1",
      status: "active",
      plan: { context: "personal" },
    };
    mockGetSubscriptionExecute.mockResolvedValue(subscription);

    const result = await getSubscription("usd");

    expect(mockGetSubscriptionExecute).toHaveBeenCalledWith("usd");
    expect(result).toBe(subscription);
  });

  it("passes currency through when provided", async () => {
    mockGetSubscriptionExecute.mockResolvedValue(null);

    await getSubscription("eur");

    expect(mockGetSubscriptionExecute).toHaveBeenCalledWith("eur");
  });

  it("passes undefined when no currency is provided", async () => {
    mockGetSubscriptionExecute.mockResolvedValue(null);

    await getSubscription();

    expect(mockGetSubscriptionExecute).toHaveBeenCalledWith(undefined);
  });

  it("returns null when the use-case throws", async () => {
    mockGetSubscriptionExecute.mockRejectedValue(new Error("API 500"));

    const result = await getSubscription("usd");

    expect(result).toBeNull();
  });

  it("returns null when the use-case resolves with null", async () => {
    mockGetSubscriptionExecute.mockResolvedValue(null);

    const result = await getSubscription();

    expect(result).toBeNull();
  });
});
