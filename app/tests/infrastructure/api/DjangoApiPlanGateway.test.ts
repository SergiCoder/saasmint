import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/domain/errors/AuthError";

const mockGetAccessToken = vi.fn();
const mockApiFetch = vi.fn();
const mockPublicApiFetch = vi.fn();

vi.mock("@/infrastructure/auth/cookies", () => ({
  getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
}));

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  publicApiFetch: (...args: unknown[]) => mockPublicApiFetch(...args),
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

  describe("listPlans (anonymous: no access token)", () => {
    beforeEach(() => {
      mockGetAccessToken.mockResolvedValue(undefined);
    });

    it("uses publicApiFetch when no token is present", async () => {
      mockPublicApiFetch.mockResolvedValue(rawPlans);

      const result = await gateway.listPlans();

      expect(mockPublicApiFetch).toHaveBeenCalledWith("/billing/plans/");
      expect(mockApiFetch).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("returns an empty array when no plans exist", async () => {
      mockPublicApiFetch.mockResolvedValue([]);

      const result = await gateway.listPlans();

      expect(result).toEqual([]);
    });

    it("appends ?currency= query string when currency is provided", async () => {
      mockPublicApiFetch.mockResolvedValue([]);

      await gateway.listPlans("eur");

      expect(mockPublicApiFetch).toHaveBeenCalledWith(
        "/billing/plans/?currency=eur",
      );
    });

    it("propagates errors from publicApiFetch", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.listPlans()).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });

  describe("listPlans (authenticated: token present)", () => {
    beforeEach(() => {
      mockGetAccessToken.mockResolvedValue("tok_abc");
    });

    it("uses apiFetch when a token is present", async () => {
      mockApiFetch.mockResolvedValue(rawPlans);

      const result = await gateway.listPlans();

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/plans/");
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("appends ?currency= query string when currency is provided", async () => {
      mockApiFetch.mockResolvedValue([]);

      await gateway.listPlans("eur");

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/plans/?currency=eur");
    });

    it("falls back to publicApiFetch when apiFetch throws AuthError", async () => {
      mockApiFetch.mockRejectedValue(
        new AuthError("token rejected", "BACKEND_REJECTED"),
      );
      mockPublicApiFetch.mockResolvedValue(rawPlans);

      const result = await gateway.listPlans();

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/plans/");
      expect(mockPublicApiFetch).toHaveBeenCalledWith("/billing/plans/");
      expect(result).toHaveLength(2);
    });

    it("does NOT fall back when apiFetch throws a non-AuthError", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.listPlans()).rejects.toThrow(
        "API 500: Server Error",
      );
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });
  });

  describe("listPlans (price transformation)", () => {
    beforeEach(() => {
      mockGetAccessToken.mockResolvedValue(undefined);
    });

    it("camelises nested price keys (display_amount → displayAmount)", async () => {
      mockPublicApiFetch.mockResolvedValue([rawPlans[0]]);

      const [plan] = await gateway.listPlans();

      expect(plan.price).toEqual({
        id: "pp1",
        amount: 999,
        displayAmount: 9.99,
        currency: "usd",
      });
    });

    it("derives displayAmount from amount when the API omits it", async () => {
      mockPublicApiFetch.mockResolvedValue([
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

      expect(plan.price).toMatchObject({
        amount: 1500,
        displayAmount: 15,
        currency: "eur",
      });
    });

    it("falls back to the requested currency when the API omits it", async () => {
      mockPublicApiFetch.mockResolvedValue([
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

      expect(plan.price).toMatchObject({ currency: "gbp" });
    });

    it("defaults currency to 'usd' when neither the API nor the caller provides one", async () => {
      mockPublicApiFetch.mockResolvedValue([
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

      expect(plan.price).toMatchObject({ currency: "usd" });
    });
  });
});
