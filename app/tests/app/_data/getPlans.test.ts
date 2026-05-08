import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListPlans = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  planGateway: {
    listPlans: (...args: unknown[]) => mockListPlans(...args),
  },
}));

let getPlans: typeof import("@/app/[locale]/(app)/_data/getPlans").getPlans;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/(app)/_data/getPlans");
  getPlans = mod.getPlans;
});

describe("getPlans", () => {
  it("returns the plans resolved by the gateway", async () => {
    const plans = [
      { id: "plan_free", context: "personal", tier: 1, interval: "month" },
      { id: "plan_pro", context: "personal", tier: 3, interval: "month" },
    ];
    mockListPlans.mockResolvedValue(plans);

    const result = await getPlans("usd");

    expect(mockListPlans).toHaveBeenCalledWith("usd");
    expect(result).toBe(plans);
  });

  it("passes undefined when no currency is provided", async () => {
    mockListPlans.mockResolvedValue([]);

    await getPlans();

    expect(mockListPlans).toHaveBeenCalledWith(undefined);
  });

  it("returns an empty array and logs the error when the gateway throws", async () => {
    const error = new Error("API 503 Service Unavailable");
    mockListPlans.mockRejectedValue(error);

    const result = await getPlans("usd");

    expect(result).toEqual([]);
    expect(vi.mocked(console.error)).toHaveBeenCalledWith(
      "Failed to fetch plans",
      error,
    );
  });

  it("returns an empty array when the gateway resolves with no rows", async () => {
    mockListPlans.mockResolvedValue([]);

    const result = await getPlans("eur");

    expect(result).toEqual([]);
  });
});
