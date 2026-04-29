import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/domain/errors/ApiError";

const mockApiFetch = vi.fn();
const mockApiFetchVoid = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiFetchVoid: (...args: unknown[]) => mockApiFetchVoid(...args),
}));

const { DjangoApiSubscriptionGateway } =
  await import("@/infrastructure/api/DjangoApiSubscriptionGateway");

beforeEach(() => {
  vi.clearAllMocks();
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const samplePersonalRow = {
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
  trial_ends_at: null,
  current_period_start: "2024-01-01T00:00:00Z",
  current_period_end: "2024-02-01T00:00:00Z",
  canceled_at: null,
  created_at: "2024-01-01T00:00:00Z",
};

const sampleTeamRow = {
  id: "s2",
  status: "active",
  plan: {
    id: "p2",
    name: "Team Pro",
    description: "Team Pro plan",
    context: "team",
    tier: 3,
    interval: "month",
    price: { id: "tp1", amount: 4900 },
  },
  quantity: 5,
  trial_ends_at: null,
  current_period_start: "2024-01-01T00:00:00Z",
  current_period_end: "2024-02-01T00:00:00Z",
  canceled_at: null,
  created_at: "2024-01-01T00:00:00Z",
};

const expectedPersonal = {
  id: "s1",
  status: "active",
  plan: {
    id: "p1",
    name: "Pro",
    description: "Pro plan",
    context: "personal",
    tier: 3,
    interval: "month",
    price: { id: "pp1", amount: 1900, displayAmount: 19, currency: "usd" },
  },
  quantity: 1,
  trialEndsAt: null,
  currentPeriodStart: "2024-01-01T00:00:00Z",
  currentPeriodEnd: "2024-02-01T00:00:00Z",
  canceledAt: null,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("DjangoApiSubscriptionGateway", () => {
  const gateway = new DjangoApiSubscriptionGateway();

  describe("listSubscriptions", () => {
    it("unwraps the paginated envelope into the row array", async () => {
      mockApiFetch.mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [samplePersonalRow],
      });

      const result = await gateway.listSubscriptions();

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/subscriptions/me/");
      expect(result).toEqual([expectedPersonal]);
    });

    it("returns an empty array when the envelope has no rows (free tier)", async () => {
      mockApiFetch.mockResolvedValue({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });

      const result = await gateway.listSubscriptions();

      expect(result).toEqual([]);
    });

    it("returns both rows for a concurrent personal+team caller", async () => {
      mockApiFetch.mockResolvedValue({
        count: 2,
        next: null,
        previous: null,
        results: [samplePersonalRow, sampleTeamRow],
      });

      const result = await gateway.listSubscriptions();

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.plan.context)).toEqual(["personal", "team"]);
    });

    it("re-throws gateway errors (no special-case 404 anymore — empty list replaces it)", async () => {
      mockApiFetch.mockRejectedValue(new ApiError(500, "Server Error"));

      await expect(gateway.listSubscriptions()).rejects.toBeInstanceOf(
        ApiError,
      );
    });

    it("appends ?currency= query string when currency is provided", async () => {
      mockApiFetch.mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [samplePersonalRow],
      });

      await gateway.listSubscriptions("eur");

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
    it("sends DELETE /billing/subscriptions/me/ without context query when omitted", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.cancelSubscription();

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/billing/subscriptions/me/",
        { method: "DELETE" },
      );
    });

    it("appends ?context=personal when targeting the personal sub", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.cancelSubscription("personal");

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/billing/subscriptions/me/?context=personal",
        { method: "DELETE" },
      );
    });

    it("appends ?context=team when targeting the team sub", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.cancelSubscription("team");

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/billing/subscriptions/me/?context=team",
        { method: "DELETE" },
      );
    });

    it("silently drops a tampered context value (defense-in-depth whitelist)", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      // RPC payload is untrusted: a malicious caller could try to inject path
      // characters or extra params. The gateway whitelist must drop anything
      // that isn't exactly "personal" or "team".
      await gateway.cancelSubscription(
        "team&admin=1" as unknown as "team",
      );

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/billing/subscriptions/me/",
        { method: "DELETE" },
      );
    });
  });

  describe("resumeSubscription", () => {
    it("sends PATCH /billing/subscriptions/me/ with cancel_at_period_end=false", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.resumeSubscription();

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/billing/subscriptions/me/",
        {
          method: "PATCH",
          body: JSON.stringify({ cancel_at_period_end: false }),
        },
      );
    });

    it("appends ?context=team when targeting the team sub", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.resumeSubscription("team");

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/billing/subscriptions/me/?context=team",
        {
          method: "PATCH",
          body: JSON.stringify({ cancel_at_period_end: false }),
        },
      );
    });

    it("appends ?context=personal when targeting the personal sub", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.resumeSubscription("personal");

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/billing/subscriptions/me/?context=personal",
        {
          method: "PATCH",
          body: JSON.stringify({ cancel_at_period_end: false }),
        },
      );
    });
  });

  describe("updateSeats", () => {
    it("sends PATCH /billing/subscriptions/me/ with quantity", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.updateSeats(5);

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/billing/subscriptions/me/",
        { method: "PATCH", body: JSON.stringify({ quantity: 5 }) },
      );
    });

    it("appends ?context=team when targeting the team sub", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.updateSeats(5, "team");

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/billing/subscriptions/me/?context=team",
        { method: "PATCH", body: JSON.stringify({ quantity: 5 }) },
      );
    });

    it("drops a tampered context value rather than emitting it (whitelist)", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.updateSeats(
        3,
        "personal'); DROP TABLE--" as unknown as "personal",
      );

      expect(mockApiFetchVoid).toHaveBeenCalledWith(
        "/billing/subscriptions/me/",
        { method: "PATCH", body: JSON.stringify({ quantity: 3 }) },
      );
    });
  });
});
