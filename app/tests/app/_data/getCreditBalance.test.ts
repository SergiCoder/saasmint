import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetBalance = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  creditsGateway: { getBalance: () => mockGetBalance() },
}));

let getCreditBalance: typeof import("@/app/[locale]/(app)/_data/getCreditBalance").getCreditBalance;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  // Re-import after resetting so React.cache() starts fresh between tests —
  // otherwise the first test's resolved value would be returned for subsequent
  // calls, masking gateway invocation differences.
  ({ getCreditBalance } =
    await import("@/app/[locale]/(app)/_data/getCreditBalance"));
});

describe("getCreditBalance", () => {
  it("returns the gateway's balance on success", async () => {
    mockGetBalance.mockResolvedValue({ balance: 50, scope: "user" });

    const result = await getCreditBalance();

    expect(result).toEqual({ balance: 50, scope: "user" });
    expect(mockGetBalance).toHaveBeenCalledOnce();
  });

  it("returns null when the gateway throws", async () => {
    // Credits are a non-critical surface — a network blip or a backend 404
    // (e.g. org-member with no active org) must not block the page render.
    mockGetBalance.mockRejectedValue(new Error("API 404"));

    const result = await getCreditBalance();

    expect(result).toBeNull();
  });
});
