import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Plan } from "@/domain/models/Plan";

const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  publicApiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiPlanGateway } =
  await import("@/infrastructure/api/DjangoApiPlanGateway");

const plans: Plan[] = [
  {
    id: "p1",
    name: "Starter",
    description: "For individuals getting started.",
    context: "personal",
    tier: "basic",
    interval: "month",
    price: {
      id: "pp1",
      amount: 999,
      displayAmount: 9.99,
      currency: "usd",
    },
  },
  {
    id: "p2",
    name: "Team",
    description: "For small teams.",
    context: "team",
    tier: "pro",
    interval: "year",
    price: {
      id: "pp2",
      amount: 9999,
      displayAmount: 99.99,
      currency: "usd",
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DjangoApiPlanGateway", () => {
  const gateway = new DjangoApiPlanGateway();

  describe("listPlans", () => {
    it("fetches plans with GET /billing/plans/", async () => {
      mockApiFetch.mockResolvedValue(plans);

      const result = await gateway.listPlans();

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/plans/");
      expect(result).toEqual(plans);
    });

    it("returns an empty array when no plans exist", async () => {
      mockApiFetch.mockResolvedValue([]);

      const result = await gateway.listPlans();
      expect(result).toEqual([]);
    });

    it("appends ?currency= query string when currency is provided", async () => {
      mockApiFetch.mockResolvedValue(plans);

      await gateway.listPlans("eur");

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/plans/?currency=eur");
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.listPlans()).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });
});
