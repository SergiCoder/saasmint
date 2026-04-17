import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetchOptional = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetchOptional: (...args: unknown[]) => mockApiFetchOptional(...args),
}));

const { DjangoApiPlanGateway } =
  await import("@/infrastructure/api/DjangoApiPlanGateway");

const rawPlans: Record<string, unknown>[] = [
  {
    id: "p1",
    name: "Starter",
    description: "For individuals getting started.",
    context: "personal",
    tier: 2,
    interval: "month",
    price: {
      id: "pp1",
      amount: 999,
      display_amount: 9.99,
      currency: "usd",
    },
  },
  {
    id: "p2",
    name: "Team",
    description: "For small teams.",
    context: "team",
    tier: 3,
    interval: "year",
    price: {
      id: "pp2",
      amount: 9999,
      display_amount: 99.99,
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
    it("calls apiFetchOptional on /billing/plans/", async () => {
      mockApiFetchOptional.mockResolvedValue(rawPlans);

      const result = await gateway.listPlans();

      expect(mockApiFetchOptional).toHaveBeenCalledWith("/billing/plans/");
      expect(result).toHaveLength(2);
    });

    it("returns an empty array when no plans exist", async () => {
      mockApiFetchOptional.mockResolvedValue([]);

      const result = await gateway.listPlans();

      expect(result).toEqual([]);
    });

    it("appends ?currency= query string when currency is provided", async () => {
      mockApiFetchOptional.mockResolvedValue([]);

      await gateway.listPlans("eur");

      expect(mockApiFetchOptional).toHaveBeenCalledWith(
        "/billing/plans/?currency=eur",
      );
    });

    it("propagates errors from apiFetchOptional", async () => {
      mockApiFetchOptional.mockRejectedValue(
        new Error("API 500: Server Error"),
      );

      await expect(gateway.listPlans()).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });

  describe("listPlans (price transformation)", () => {
    it("camelises nested price keys (display_amount → displayAmount)", async () => {
      mockApiFetchOptional.mockResolvedValue([rawPlans[0]]);

      const [plan] = await gateway.listPlans();

      expect(plan!.price).toEqual({
        id: "pp1",
        amount: 999,
        displayAmount: 9.99,
        currency: "usd",
      });
    });

    it("derives displayAmount from amount when the API omits it", async () => {
      mockApiFetchOptional.mockResolvedValue([
        {
          id: "p1",
          name: "Starter",
          description: "",
          context: "personal",
          tier: 2,
          interval: "month",
          price: { id: "pp1", amount: 1500, currency: "eur" },
        },
      ]);

      const [plan] = await gateway.listPlans();

      expect(plan!.price).toMatchObject({
        amount: 1500,
        displayAmount: 15,
        currency: "eur",
      });
    });

    it("falls back to the requested currency when the API omits it", async () => {
      mockApiFetchOptional.mockResolvedValue([
        {
          id: "p1",
          name: "Starter",
          description: "",
          context: "personal",
          tier: 2,
          interval: "month",
          price: { id: "pp1", amount: 1500, display_amount: 15 },
        },
      ]);

      const [plan] = await gateway.listPlans("gbp");

      expect(plan!.price).toMatchObject({ currency: "gbp" });
    });

    it("defaults currency to 'usd' when neither the API nor the caller provides one", async () => {
      mockApiFetchOptional.mockResolvedValue([
        {
          id: "p1",
          name: "Starter",
          description: "",
          context: "personal",
          tier: 2,
          interval: "month",
          price: { id: "pp1", amount: 999, display_amount: 9.99 },
        },
      ]);

      const [plan] = await gateway.listPlans();

      expect(plan!.price).toMatchObject({ currency: "usd" });
    });
  });
});
