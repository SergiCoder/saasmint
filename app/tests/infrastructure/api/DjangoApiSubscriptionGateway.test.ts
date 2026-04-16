import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiSubscriptionGateway } =
  await import("@/infrastructure/api/DjangoApiSubscriptionGateway");

beforeEach(() => {
  vi.clearAllMocks();
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

describe("DjangoApiSubscriptionGateway", () => {
  const gateway = new DjangoApiSubscriptionGateway();

  describe("getSubscription", () => {
    it("fetches and camelCases the subscription from GET /billing/subscriptions/me/", async () => {
      mockApiFetch.mockResolvedValue({
        id: "s1",
        status: "active",
        plan: {
          id: "p1",
          name: "Pro",
          description: "Pro plan",
          context: "personal",
          tier: 3,
          interval: "month",
          price: { id: "pp1", amount: 1900 },
        },
        quantity: 1,
        discount_percent: null,
        discount_end_at: null,
        trial_ends_at: null,
        current_period_start: "2024-01-01T00:00:00Z",
        current_period_end: "2024-02-01T00:00:00Z",
        canceled_at: null,
        created_at: "2024-01-01T00:00:00Z",
      });

      const result = await gateway.getSubscription();

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/subscriptions/me/");
      expect(result).toEqual({
        id: "s1",
        status: "active",
        plan: {
          id: "p1",
          name: "Pro",
          description: "Pro plan",
          context: "personal",
          tier: 3,
          interval: "month",
          price: {
            id: "pp1",
            amount: 1900,
            displayAmount: 19,
            currency: "usd",
          },
        },
        quantity: 1,
        discountPercent: null,
        discountEndAt: null,
        trialEndsAt: null,
        currentPeriodStart: "2024-01-01T00:00:00Z",
        currentPeriodEnd: "2024-02-01T00:00:00Z",
        canceledAt: null,
        createdAt: "2024-01-01T00:00:00Z",
      });
    });

    it("returns null when API responds with 404", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 404: Not Found"));

      const result = await gateway.getSubscription();
      expect(result).toBeNull();
    });

    it("re-throws non-404 errors", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.getSubscription()).rejects.toThrow(
        "API 500: Server Error",
      );
    });

    it("appends ?currency= query string when currency is provided", async () => {
      mockApiFetch.mockResolvedValue({
        id: "s1",
        status: "active",
        plan: {
          id: "p1",
          name: "Pro",
          description: "Pro plan",
          context: "personal",
          tier: 3,
          interval: "month",
          price: { id: "pp1", amount: 1900 },
        },
        quantity: 1,
        discount_percent: null,
        discount_end_at: null,
        trial_ends_at: null,
        current_period_start: "2024-01-01T00:00:00Z",
        current_period_end: "2024-02-01T00:00:00Z",
        canceled_at: null,
        created_at: "2024-01-01T00:00:00Z",
      });

      await gateway.getSubscription("eur");

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/billing/subscriptions/me/?currency=eur",
      );
    });
  });

  describe("createCheckoutSession", () => {
    it("sends POST /billing/checkout-sessions/ with snake_case body", async () => {
      const response = { url: "https://checkout.stripe.com/session_abc" };
      mockApiFetch.mockResolvedValue(response);

      const input = {
        planPriceId: "price_123",
        successUrl: `${APP_URL}/billing?status=success`,
        cancelUrl: `${APP_URL}/billing`,
      };
      const result = await gateway.createCheckoutSession(input);

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/checkout-sessions/", {
        method: "POST",
        body: JSON.stringify({
          plan_price_id: "price_123",
          success_url: `${APP_URL}/billing?status=success`,
          cancel_url: `${APP_URL}/billing`,
        }),
      });
      expect(result).toEqual(response);
    });

    it("includes quantity in snake_case body when provided", async () => {
      mockApiFetch.mockResolvedValue({ url: "https://checkout.stripe.com/x" });

      await gateway.createCheckoutSession({
        planPriceId: "price_team",
        quantity: 5,
        successUrl: `${APP_URL}/billing?status=success`,
        cancelUrl: `${APP_URL}/billing`,
      });

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/billing/checkout-sessions/",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"quantity":5'),
        }),
      );
    });
  });

  describe("createBillingPortalSession", () => {
    it("sends POST /billing/portal-sessions/ with snake_case body", async () => {
      const response = { url: "https://billing.stripe.com/portal_abc" };
      mockApiFetch.mockResolvedValue(response);

      const input = { returnUrl: `${APP_URL}/billing` };
      const result = await gateway.createBillingPortalSession(input);

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/portal-sessions/", {
        method: "POST",
        body: JSON.stringify({
          return_url: `${APP_URL}/billing`,
        }),
      });
      expect(result).toEqual(response);
    });
  });

  describe("cancelSubscription", () => {
    it("sends DELETE /billing/subscriptions/me/", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.cancelSubscription();

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/subscriptions/me/", {
        method: "DELETE",
      });
    });
  });

  describe("resumeSubscription", () => {
    it("sends PATCH /billing/subscriptions/me/ with cancel_at_period_end=false", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.resumeSubscription();

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/subscriptions/me/", {
        method: "PATCH",
        body: JSON.stringify({ cancel_at_period_end: false }),
      });
    });
  });

  describe("updateSeats", () => {
    it("sends PATCH /billing/subscriptions/me/ with quantity", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.updateSeats(5);

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/subscriptions/me/", {
        method: "PATCH",
        body: JSON.stringify({ quantity: 5 }),
      });
    });
  });
});
