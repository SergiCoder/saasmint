import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListSubscriptions = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  subscriptionGateway: {
    listSubscriptions: (...args: unknown[]) => mockListSubscriptions(...args),
  },
}));

let getSubscriptions: typeof import("@/app/[locale]/_data/getSubscriptions").getSubscriptions;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/_data/getSubscriptions");
  getSubscriptions = mod.getSubscriptions;
});

describe("getSubscriptions", () => {
  it("returns the list resolved by the gateway", async () => {
    const subs = [
      { id: "sub_personal", plan: { context: "personal" } },
      { id: "sub_team", plan: { context: "team" } },
    ];
    mockListSubscriptions.mockResolvedValue(subs);

    const result = await getSubscriptions("usd");

    expect(mockListSubscriptions).toHaveBeenCalledWith("usd");
    expect(result).toBe(subs);
  });

  it("passes undefined when no currency is provided", async () => {
    mockListSubscriptions.mockResolvedValue([]);

    await getSubscriptions();

    expect(mockListSubscriptions).toHaveBeenCalledWith(undefined);
  });

  it("returns an empty array when the gateway throws", async () => {
    mockListSubscriptions.mockRejectedValue(new Error("API 500"));

    const result = await getSubscriptions("usd");

    expect(result).toEqual([]);
  });

  it("returns an empty array when the gateway resolves with no rows (free tier)", async () => {
    mockListSubscriptions.mockResolvedValue([]);

    const result = await getSubscriptions();

    expect(result).toEqual([]);
  });
});
