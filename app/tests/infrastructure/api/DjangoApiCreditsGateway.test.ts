import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiCreditsGateway } =
  await import("@/infrastructure/api/DjangoApiCreditsGateway");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DjangoApiCreditsGateway", () => {
  const gateway = new DjangoApiCreditsGateway();

  it("fetches /billing/credits/me/ and returns the parsed balances", async () => {
    mockApiFetch.mockResolvedValue({
      balances: [{ balance: 142, scope: "user" }],
    });

    const result = await gateway.listBalances();

    expect(mockApiFetch).toHaveBeenCalledWith("/billing/credits/me/");
    expect(result).toEqual([{ balance: 142, scope: "user" }]);
  });

  it("returns both rows for concurrent personal+team billers (rule 5)", async () => {
    mockApiFetch.mockResolvedValue({
      balances: [
        { balance: 500, scope: "org" },
        { balance: 75, scope: "user" },
      ],
    });

    const result = await gateway.listBalances();

    expect(result).toEqual([
      { balance: 500, scope: "org" },
      { balance: 75, scope: "user" },
    ]);
  });

  it("returns an empty array when the user has no credits", async () => {
    mockApiFetch.mockResolvedValue({ balances: [] });

    const result = await gateway.listBalances();

    expect(result).toEqual([]);
  });

  it("rejects negative balances at the schema boundary", async () => {
    // The backend has a non-negative DB constraint; if it's ever bypassed,
    // schema validation must catch it before the UI renders garbage.
    mockApiFetch.mockResolvedValue({
      balances: [{ balance: -1, scope: "user" }],
    });

    await expect(gateway.listBalances()).rejects.toThrow();
  });

  it("rejects an unknown scope value at the schema boundary", async () => {
    mockApiFetch.mockResolvedValue({
      balances: [{ balance: 0, scope: "global" }],
    });

    await expect(gateway.listBalances()).rejects.toThrow();
  });

  it("rejects responses missing the balances envelope", async () => {
    mockApiFetch.mockResolvedValue({ balance: 50, scope: "user" });

    await expect(gateway.listBalances()).rejects.toThrow();
  });

  it("propagates errors from apiFetch", async () => {
    mockApiFetch.mockRejectedValue(new Error("API 401: unauthorized"));

    await expect(gateway.listBalances()).rejects.toThrow(
      "API 401: unauthorized",
    );
  });
});
