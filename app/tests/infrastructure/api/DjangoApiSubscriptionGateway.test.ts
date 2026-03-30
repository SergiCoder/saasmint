import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Subscription } from "@/domain/models/Subscription";

const mockGetAuthToken = vi.fn().mockResolvedValue("tok_test");
const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiSubscriptionGateway } =
  await import("@/infrastructure/api/DjangoApiSubscriptionGateway");

const subscription: Subscription = {
  id: "s1",
  stripeId: "sub_123",
  status: "active",
  plan: { id: "p1", name: "Starter", context: "personal", interval: "month" },
  quantity: 1,
  currentPeriodStart: "2024-01-01T00:00:00Z",
  currentPeriodEnd: "2024-02-01T00:00:00Z",
  cancelAtPeriodEnd: false,
  trialEnd: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthToken.mockResolvedValue("tok_test");
});

describe("DjangoApiSubscriptionGateway", () => {
  const gateway = new DjangoApiSubscriptionGateway();

  describe("getSubscription", () => {
    it("fetches the subscription with GET /billing/subscription/", async () => {
      mockApiFetch.mockResolvedValue(subscription);

      const result = await gateway.getSubscription("o1");

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/billing/subscription/",
        "tok_test",
      );
      expect(result).toEqual(subscription);
    });

    it("returns null when API responds with 404", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 404: Not Found"));

      const result = await gateway.getSubscription("o1");
      expect(result).toBeNull();
    });

    it("re-throws non-404 errors", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.getSubscription("o1")).rejects.toThrow(
        "API 500: Server Error",
      );
    });

    it("re-throws non-Error exceptions", async () => {
      mockApiFetch.mockRejectedValue("unexpected");

      await expect(gateway.getSubscription("o1")).rejects.toBe("unexpected");
    });
  });

  describe("createCheckoutSession", () => {
    it("sends POST /billing/checkout/ with input body", async () => {
      const response = { url: "https://checkout.stripe.com/session_abc" };
      mockApiFetch.mockResolvedValue(response);

      const input = { planPriceId: "price_123", orgId: "o1" };
      const result = await gateway.createCheckoutSession(input);

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/billing/checkout/",
        "tok_test",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      expect(result).toEqual(response);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 400: Bad Request"));

      await expect(
        gateway.createCheckoutSession({ planPriceId: "price_123" }),
      ).rejects.toThrow("API 400: Bad Request");
    });
  });

  describe("createBillingPortalSession", () => {
    it("sends POST /billing/portal/ with input body", async () => {
      const response = { url: "https://billing.stripe.com/portal_abc" };
      mockApiFetch.mockResolvedValue(response);

      const input = { orgId: "o1" };
      const result = await gateway.createBillingPortalSession(input);

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/billing/portal/",
        "tok_test",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      expect(result).toEqual(response);
    });

    it("works without orgId", async () => {
      const response = { url: "https://billing.stripe.com/portal_def" };
      mockApiFetch.mockResolvedValue(response);

      const input = {};
      const result = await gateway.createBillingPortalSession(input);

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/billing/portal/",
        "tok_test",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      expect(result).toEqual(response);
    });
  });
});
