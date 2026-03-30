import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Plan } from "@/domain/models/Plan";

const mockGetAuthToken = vi.fn().mockResolvedValue("tok_test");
const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiPlanGateway } =
  await import("@/infrastructure/api/DjangoApiPlanGateway");

const plans: Plan[] = [
  {
    id: "p1",
    name: "Starter",
    context: "personal",
    interval: "month",
    isActive: true,
    prices: [
      { id: "pp1", stripePriceId: "price_123", currency: "USD", amount: 999 },
    ],
  },
  {
    id: "p2",
    name: "Team",
    context: "team",
    interval: "year",
    isActive: true,
    prices: [
      {
        id: "pp2",
        stripePriceId: "price_456",
        currency: "USD",
        amount: 9999,
      },
    ],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthToken.mockResolvedValue("tok_test");
});

describe("DjangoApiPlanGateway", () => {
  const gateway = new DjangoApiPlanGateway();

  describe("listPlans", () => {
    it("fetches plans with GET /billing/plans/", async () => {
      mockApiFetch.mockResolvedValue(plans);

      const result = await gateway.listPlans();

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith("/billing/plans/", "tok_test");
      expect(result).toEqual(plans);
    });

    it("returns an empty array when no plans exist", async () => {
      mockApiFetch.mockResolvedValue([]);

      const result = await gateway.listPlans();
      expect(result).toEqual([]);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.listPlans()).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });
});
