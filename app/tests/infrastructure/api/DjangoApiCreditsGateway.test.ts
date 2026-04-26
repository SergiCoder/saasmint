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

  it("fetches /billing/credits/me/ and returns the parsed balance", async () => {
    mockApiFetch.mockResolvedValue({ balance: 142, scope: "user" });

    const result = await gateway.getBalance();

    expect(mockApiFetch).toHaveBeenCalledWith("/billing/credits/me/");
    expect(result).toEqual({ balance: 142, scope: "user" });
  });

  it("accepts an org-scoped balance unchanged", async () => {
    mockApiFetch.mockResolvedValue({ balance: 9000, scope: "org" });

    const result = await gateway.getBalance();

    expect(result).toEqual({ balance: 9000, scope: "org" });
  });

  it("rejects negative balances at the schema boundary", async () => {
    // The backend has a non-negative DB constraint; if it's ever bypassed,
    // schema validation must catch it before the UI renders garbage.
    mockApiFetch.mockResolvedValue({ balance: -1, scope: "user" });

    await expect(gateway.getBalance()).rejects.toThrow();
  });

  it("rejects an unknown scope value at the schema boundary", async () => {
    mockApiFetch.mockResolvedValue({ balance: 0, scope: "global" });

    await expect(gateway.getBalance()).rejects.toThrow();
  });

  it("propagates errors from apiFetch", async () => {
    mockApiFetch.mockRejectedValue(new Error("API 401: unauthorized"));

    await expect(gateway.getBalance()).rejects.toThrow("API 401: unauthorized");
  });
});
