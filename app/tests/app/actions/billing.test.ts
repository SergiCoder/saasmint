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

const mockGetCurrentUser = vi.fn();
const mockGetSubscription = vi.fn();
const mockCreateCheckoutSession = vi.fn();
const mockCreateBillingPortalSession = vi.fn();
const mockCancelSubscription = vi.fn();
const mockResumeSubscription = vi.fn();
const mockUpdateSeats = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  authGateway: { getCurrentUser: mockGetCurrentUser },
  subscriptionGateway: {
    getSubscription: mockGetSubscription,
    createCheckoutSession: mockCreateCheckoutSession,
    createBillingPortalSession: mockCreateBillingPortalSession,
    cancelSubscription: mockCancelSubscription,
    resumeSubscription: mockResumeSubscription,
    updateSeats: mockUpdateSeats,
  },
}));

const mockCanManageBilling = vi.fn();
vi.mock("@/app/[locale]/(app)/subscription/_data/canManageBilling", () => ({
  canManageBilling: (...args: unknown[]) => mockCanManageBilling(...args),
}));

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

let startCheckout: typeof import("@/app/actions/billing").startCheckout;
let openBillingPortal: typeof import("@/app/actions/billing").openBillingPortal;
let cancelRenewal: typeof import("@/app/actions/billing").cancelRenewal;
let resumeSubscription: typeof import("@/app/actions/billing").resumeSubscription;
let updateSeats: typeof import("@/app/actions/billing").updateSeats;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/billing");
  startCheckout = mod.startCheckout;
  openBillingPortal = mod.openBillingPortal;
  cancelRenewal = mod.cancelRenewal;
  resumeSubscription = mod.resumeSubscription;
  updateSeats = mod.updateSeats;
});

describe("billing server actions", () => {
  describe("startCheckout", () => {
    it("redirects to checkout URL with successUrl and cancelUrl", async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/session_123",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
        planPriceId: "price_abc",
        successUrl: `${APP_URL}/subscription?status=success`,
        cancelUrl: `${APP_URL}/subscription`,
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "https://checkout.stripe.com/session_123",
      );
    });

    it("returns invalid_input when planPriceId is missing", async () => {
      const formData = new FormData();

      const result = await startCheckout(undefined, formData);
      expect(result).toEqual({ ok: false, code: "invalid_input" });
      expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
    });

    it("forwards quantity when present and > 0", async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_xyz",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("quantity", "5");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ planPriceId: "price_team", quantity: 5 }),
      );
    });

    it("forwards orgName when provided", async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_team",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("quantity", "3");
      formData.set("orgName", "Acme Corp");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          planPriceId: "price_team",
          quantity: 3,
          orgName: "Acme Corp",
        }),
      );
    });

    it("omits orgName when empty and quantity when 0 or invalid", async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_team",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("orgName", "");
      formData.set("quantity", "0");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      const callArgs = mockCreateCheckoutSession.mock.calls[0]![0];
      expect(callArgs.orgName).toBeUndefined();
      expect(callArgs.quantity).toBeUndefined();
    });

    it("returns checkout_failed when gateway throws", async () => {
      mockCreateCheckoutSession.mockRejectedValue(new Error("network down"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      const result = await startCheckout(undefined, formData);
      expect(result).toEqual({ ok: false, code: "checkout_failed" });
      expect(mockRedirect).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("openBillingPortal", () => {
    const portalUser = { id: "u1" };
    const portalSubscription = { id: "s1", plan: { context: "personal" } };

    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue(portalUser);
      mockGetSubscription.mockResolvedValue(portalSubscription);
      mockCanManageBilling.mockResolvedValue(true);
    });

    it("redirects to billing portal URL with returnUrl", async () => {
      mockCreateBillingPortalSession.mockResolvedValue({
        url: "https://billing.stripe.com/portal_123",
      });

      await expect(openBillingPortal()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockCreateBillingPortalSession).toHaveBeenCalledWith({
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
      expect(mockCreateBillingPortalSession).not.toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("swallows non-redirect errors and returns without redirecting", async () => {
      mockCreateBillingPortalSession.mockRejectedValue(new Error("portal down"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await openBillingPortal();
      expect(result).toBeUndefined();
      expect(mockRedirect).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("cancelRenewal", () => {
    const user = { id: "u1" };
    const subscription = { id: "s1", plan: { context: "personal" } };

    it("cancels the subscription and revalidates when allowed", async () => {
      mockGetCurrentUser.mockResolvedValue(user);
      mockGetSubscription.mockResolvedValue(subscription);
      mockCanManageBilling.mockResolvedValue(true);
      mockCancelSubscription.mockResolvedValue(undefined);

      const result = await cancelRenewal();

      expect(mockCancelSubscription).toHaveBeenCalledOnce();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/subscription", "layout");
      expect(result.ok).toBe(true);
    });

    it("returns not_billing_member when caller cannot manage billing", async () => {
      mockGetCurrentUser.mockResolvedValue(user);
      mockGetSubscription.mockResolvedValue(subscription);
      mockCanManageBilling.mockResolvedValue(false);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cancelRenewal();

      expect(result).toEqual({ ok: false, code: "not_billing_member" });
      expect(mockCancelSubscription).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("returns no_subscription when there is no active subscription", async () => {
      mockGetCurrentUser.mockResolvedValue(user);
      mockGetSubscription.mockResolvedValue(null);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cancelRenewal();

      expect(result).toEqual({ ok: false, code: "no_subscription" });
      expect(mockCancelSubscription).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("resumeSubscription", () => {
    const user = { id: "u1" };
    const subscription = { id: "s1", plan: { context: "team" } };

    it("resumes and revalidates when user can manage billing", async () => {
      mockGetCurrentUser.mockResolvedValue(user);
      mockGetSubscription.mockResolvedValue(subscription);
      mockCanManageBilling.mockResolvedValue(true);
      mockResumeSubscription.mockResolvedValue(undefined);

      const result = await resumeSubscription();

      expect(mockResumeSubscription).toHaveBeenCalledOnce();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/subscription", "layout");
      expect(result.ok).toBe(true);
    });

    it("returns not_billing_member when user cannot manage billing", async () => {
      mockGetCurrentUser.mockResolvedValue(user);
      mockGetSubscription.mockResolvedValue(subscription);
      mockCanManageBilling.mockResolvedValue(false);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await resumeSubscription();

      expect(result).toEqual({ ok: false, code: "not_billing_member" });
      expect(mockResumeSubscription).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("updateSeats", () => {
    const seatsUser = { id: "u1" };
    const teamSubscription = { id: "s1", plan: { context: "team" } };

    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue(seatsUser);
      mockGetSubscription.mockResolvedValue(teamSubscription);
      mockCanManageBilling.mockResolvedValue(true);
    });

    it("updates seats and revalidates the org layout on success", async () => {
      mockUpdateSeats.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("quantity", "5");

      const result = await updateSeats(undefined, formData);
      expect(mockUpdateSeats).toHaveBeenCalledWith(5);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org", "layout");
      expect(result.ok).toBe(true);
    });

    it("returns invalid_seat_count when quantity is missing, 0, NaN, or too large", async () => {
      for (const raw of ["", "0", "abc", "999999"]) {
        const fd = new FormData();
        if (raw !== "") fd.set("quantity", raw);
        const result = await updateSeats(undefined, fd);
        expect(result).toEqual({ ok: false, code: "invalid_seat_count" });
      }
      expect(mockUpdateSeats).not.toHaveBeenCalled();
    });

    it("returns not_billing_member when caller cannot manage billing", async () => {
      mockCanManageBilling.mockResolvedValue(false);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const fd = new FormData();
      fd.set("quantity", "5");

      const result = await updateSeats(undefined, fd);
      expect(result).toEqual({ ok: false, code: "not_billing_member" });
      expect(mockUpdateSeats).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
});
