import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListBalances = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  creditsGateway: { listBalances: () => mockListBalances() },
}));

let getCreditBalances: typeof import("@/app/[locale]/(app)/_data/getCreditBalances").getCreditBalances;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  // Re-import after resetting so React.cache() starts fresh between tests —
  // otherwise the first test's resolved value would be returned for subsequent
  // calls, masking gateway invocation differences.
  ({ getCreditBalances } =
    await import("@/app/[locale]/(app)/_data/getCreditBalances"));
});

describe("getCreditBalances", () => {
  it("returns the gateway's balances on success", async () => {
    mockListBalances.mockResolvedValue([
      { balance: 50, scope: "user" },
      { balance: 200, scope: "org" },
    ]);

    const result = await getCreditBalances();

    expect(result).toEqual([
      { balance: 50, scope: "user" },
      { balance: 200, scope: "org" },
    ]);
    expect(mockListBalances).toHaveBeenCalledOnce();
  });

  it("returns an empty array when the gateway throws", async () => {
    // Credits are a non-critical surface — a network blip or a backend 404
    // must not block the page render.
    mockListBalances.mockRejectedValue(new Error("API 404"));

    const result = await getCreditBalances();

    expect(result).toEqual([]);
  });

  it("passes through an empty list (free tier)", async () => {
    mockListBalances.mockResolvedValue([]);

    const result = await getCreditBalances();

    expect(result).toEqual([]);
  });
});
