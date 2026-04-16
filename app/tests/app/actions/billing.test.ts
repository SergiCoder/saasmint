import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
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

const mockCancelSubscriptionExecute = vi.fn();
vi.mock("@/application/use-cases/billing/CancelSubscription", () => ({
  CancelSubscription: function CancelSubscription() {
    return { execute: mockCancelSubscriptionExecute };
  },
}));

const mockResumeSubscriptionExecute = vi.fn();
vi.mock("@/application/use-cases/billing/ResumeSubscription", () => ({
  ResumeSubscription: function ResumeSubscription() {
    return { execute: mockResumeSubscriptionExecute };
  },
}));

const mockGetCurrentUserExecute = vi.fn();
vi.mock("@/application/use-cases/auth/GetCurrentUser", () => ({
  GetCurrentUser: function GetCurrentUser() {
    return { execute: mockGetCurrentUserExecute };
  },
}));

const mockGetSubscriptionExecute = vi.fn();
vi.mock("@/application/use-cases/billing/GetSubscription", () => ({
  GetSubscription: function GetSubscription() {
    return { execute: mockGetSubscriptionExecute };
  },
}));

const mockCanManageBilling = vi.fn();
vi.mock("@/app/[locale]/(app)/subscription/_data/canManageBilling", () => ({
  canManageBilling: (...args: unknown[]) => mockCanManageBilling(...args),
}));

vi.mock("@/infrastructure/registry", () => ({
  subscriptionGateway: {},
  authGateway: {},
}));

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

let startCheckout: typeof import("@/app/actions/billing").startCheckout;
let openBillingPortal: typeof import("@/app/actions/billing").openBillingPortal;
let cancelSubscription: typeof import("@/app/actions/billing").cancelSubscription;
let resumeSubscription: typeof import("@/app/actions/billing").resumeSubscription;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/billing");
  startCheckout = mod.startCheckout;
  openBillingPortal = mod.openBillingPortal;
  cancelSubscription = mod.cancelSubscription;
  resumeSubscription = mod.resumeSubscription;
});

describe("billing server actions", () => {
  describe("startCheckout", () => {
    it("redirects to checkout URL with successUrl and cancelUrl", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://checkout.stripe.com/session_123",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockStartCheckoutExecute).toHaveBeenCalledWith({
        planPriceId: "price_abc",
        successUrl: `${APP_URL}/subscription?status=success`,
        cancelUrl: `${APP_URL}/subscription`,
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "https://checkout.stripe.com/session_123",
      );
    });

    it("returns error when planPriceId is missing", async () => {
      const formData = new FormData();

      const result = await startCheckout(undefined, formData);
      expect(result).toEqual({ ok: false, error: "Invalid input" });
      expect(mockStartCheckoutExecute).not.toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("forwards quantity when present and > 0", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_xyz",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("quantity", "5");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockStartCheckoutExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          planPriceId: "price_team",
          quantity: 5,
        }),
      );
    });

    it("omits quantity when value is 0 or invalid", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_xyz",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("quantity", "0");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      const callArgs = mockStartCheckoutExecute.mock.calls[0][0];
      expect(callArgs.quantity).toBeUndefined();
    });

    it("returns error when checkout fails", async () => {
      mockStartCheckoutExecute.mockRejectedValue(new Error("network down"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      const result = await startCheckout(undefined, formData);
      expect(result).toEqual({
        ok: false,
        error: "Failed to start checkout",
      });
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("openBillingPortal", () => {
    const portalUser = { id: "u1" };
    const portalSubscription = {
      id: "s1",
      plan: { context: "personal" },
    };

    beforeEach(() => {
      mockGetCurrentUserExecute.mockResolvedValue(portalUser);
      mockGetSubscriptionExecute.mockResolvedValue(portalSubscription);
      mockCanManageBilling.mockResolvedValue(true);
    });

    it("redirects to billing portal URL with returnUrl", async () => {
      mockOpenBillingPortalExecute.mockResolvedValue({
        url: "https://billing.stripe.com/portal_123",
      });

      await expect(openBillingPortal()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockOpenBillingPortalExecute).toHaveBeenCalledWith({
        returnUrl: `${APP_URL}/subscription`,
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "https://billing.stripe.com/portal_123",
      );
    });

    it("does not open the portal when the caller cannot manage billing", async () => {
      mockCanManageBilling.mockResolvedValue(false);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await openBillingPortal();
      expect(result).toBeUndefined();
      expect(mockOpenBillingPortalExecute).not.toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("swallows non-redirect errors and returns without redirecting", async () => {
      mockOpenBillingPortalExecute.mockRejectedValue(new Error("portal down"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await openBillingPortal();
      expect(result).toBeUndefined();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("cancelSubscription", () => {
    const user = { id: "u1" };
    const subscription = {
      id: "s1",
      plan: { context: "personal" },
    };

    it("calls the use-case and revalidates the subscription page when allowed", async () => {
      mockGetCurrentUserExecute.mockResolvedValue(user);
      mockGetSubscriptionExecute.mockResolvedValue(subscription);
      mockCanManageBilling.mockResolvedValue(true);
      mockCancelSubscriptionExecute.mockResolvedValue(undefined);

      await cancelSubscription();

      expect(mockCanManageBilling).toHaveBeenCalledWith(user, subscription);
      expect(mockCancelSubscriptionExecute).toHaveBeenCalledOnce();
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/[locale]/subscription",
        "page",
      );
    });

    it("does not call the use-case or revalidate when the user cannot manage billing", async () => {
      mockGetCurrentUserExecute.mockResolvedValue(user);
      mockGetSubscriptionExecute.mockResolvedValue(subscription);
      mockCanManageBilling.mockResolvedValue(false);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await cancelSubscription();

      expect(mockCancelSubscriptionExecute).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("does not call the use-case when there is no active subscription", async () => {
      mockGetCurrentUserExecute.mockResolvedValue(user);
      mockGetSubscriptionExecute.mockResolvedValue(null);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await cancelSubscription();

      expect(mockCancelSubscriptionExecute).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("swallows use-case errors without revalidating", async () => {
      mockGetCurrentUserExecute.mockResolvedValue(user);
      mockGetSubscriptionExecute.mockResolvedValue(subscription);
      mockCanManageBilling.mockResolvedValue(true);
      mockCancelSubscriptionExecute.mockRejectedValue(new Error("API 500"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await cancelSubscription();

      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("resumeSubscription", () => {
    const user = { id: "u1" };
    const subscription = {
      id: "s1",
      plan: { context: "team" },
    };

    it("calls the use-case and revalidates when the user is the billing member", async () => {
      mockGetCurrentUserExecute.mockResolvedValue(user);
      mockGetSubscriptionExecute.mockResolvedValue(subscription);
      mockCanManageBilling.mockResolvedValue(true);
      mockResumeSubscriptionExecute.mockResolvedValue(undefined);

      await resumeSubscription();

      expect(mockCanManageBilling).toHaveBeenCalledWith(user, subscription);
      expect(mockResumeSubscriptionExecute).toHaveBeenCalledOnce();
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/[locale]/subscription",
        "page",
      );
    });

    it("does not call the use-case when the user is not the billing member", async () => {
      mockGetCurrentUserExecute.mockResolvedValue(user);
      mockGetSubscriptionExecute.mockResolvedValue(subscription);
      mockCanManageBilling.mockResolvedValue(false);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await resumeSubscription();

      expect(mockResumeSubscriptionExecute).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
});
