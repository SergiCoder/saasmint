import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockStartCheckoutExecute = vi.fn();
vi.mock("@/application/use-cases/billing/StartCheckout", () => ({
  StartCheckout: function StartCheckout() {
    return { execute: mockStartCheckoutExecute };
  },
}));

const mockOpenBillingPortalExecute = vi.fn();
vi.mock("@/application/use-cases/billing/OpenBillingPortal", () => ({
  OpenBillingPortal: function OpenBillingPortal() {
    return { execute: mockOpenBillingPortalExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  subscriptionGateway: {},
}));

let startCheckout: typeof import("@/app/actions/billing").startCheckout;
let openBillingPortal: typeof import("@/app/actions/billing").openBillingPortal;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/billing");
  startCheckout = mod.startCheckout;
  openBillingPortal = mod.openBillingPortal;
});

describe("billing server actions", () => {
  describe("startCheckout", () => {
    it("redirects to checkout URL", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://checkout.stripe.com/session_123",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      await expect(startCheckout(formData)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockStartCheckoutExecute).toHaveBeenCalledWith({
        planPriceId: "price_abc",
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "https://checkout.stripe.com/session_123",
      );
    });

    it("includes orgId when provided", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://checkout.stripe.com/session_456",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");
      formData.set("orgId", "org_123");

      await expect(startCheckout(formData)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockStartCheckoutExecute).toHaveBeenCalledWith({
        planPriceId: "price_abc",
        orgId: "org_123",
      });
    });

    it("omits orgId when not provided", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://checkout.stripe.com/session_789",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      await expect(startCheckout(formData)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockStartCheckoutExecute).toHaveBeenCalledWith({
        planPriceId: "price_abc",
      });
    });

    it("omits orgId when it is an empty string", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://checkout.stripe.com/session_empty",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");
      formData.set("orgId", "");

      await expect(startCheckout(formData)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockStartCheckoutExecute).toHaveBeenCalledWith({
        planPriceId: "price_abc",
      });
    });

    it("returns early when planPriceId is missing", async () => {
      const formData = new FormData();

      const result = await startCheckout(formData);
      expect(result).toBeUndefined();
      expect(mockStartCheckoutExecute).not.toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("throws on untrusted redirect URL", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://evil.com/steal",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      await expect(startCheckout(formData)).rejects.toThrow(
        "Untrusted redirect URL",
      );
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("openBillingPortal", () => {
    it("redirects to billing portal URL", async () => {
      mockOpenBillingPortalExecute.mockResolvedValue({
        url: "https://billing.stripe.com/portal_123",
      });

      const formData = new FormData();

      await expect(openBillingPortal(formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        "https://billing.stripe.com/portal_123",
      );
    });

    it("includes orgId when provided", async () => {
      mockOpenBillingPortalExecute.mockResolvedValue({
        url: "https://billing.stripe.com/portal_456",
      });

      const formData = new FormData();
      formData.set("orgId", "org_123");

      await expect(openBillingPortal(formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockOpenBillingPortalExecute).toHaveBeenCalledWith({
        orgId: "org_123",
      });
    });

    it("omits orgId when it is an empty string", async () => {
      mockOpenBillingPortalExecute.mockResolvedValue({
        url: "https://billing.stripe.com/portal_empty",
      });

      const formData = new FormData();
      formData.set("orgId", "");

      await expect(openBillingPortal(formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockOpenBillingPortalExecute).toHaveBeenCalledWith({});
    });

    it("throws on untrusted redirect URL", async () => {
      mockOpenBillingPortalExecute.mockResolvedValue({
        url: "https://malicious.site/phish",
      });

      const formData = new FormData();

      await expect(openBillingPortal(formData)).rejects.toThrow(
        "Untrusted redirect URL",
      );
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });
});
