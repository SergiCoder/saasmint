import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockRevalidatePath = vi.fn();
vi.mock("@/lib/revalidate", () => ({
  // The action calls `revalidateLocalizedPath`; assert on the bare path so
  // tests don't have to enumerate every supported locale.
  revalidateLocalizedPath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const mockGetCurrentUserIdFromCookie = vi.fn<() => Promise<string | null>>();
vi.mock("@/lib/jwt", () => ({
  getCurrentUserIdFromCookie: () => mockGetCurrentUserIdFromCookie(),
}));

const mockListSubscriptions = vi.fn();
const mockCreateCheckoutSession = vi.fn();
const mockCreateBillingPortalSession = vi.fn();
const mockCancelSubscription = vi.fn();
const mockResumeSubscription = vi.fn();
const mockUpdateSeats = vi.fn();
const mockCreateProductCheckoutSession = vi.fn();
const mockReleaseScheduledChange = vi.fn();
const mockChangePlan = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  subscriptionGateway: {
    listSubscriptions: mockListSubscriptions,
    createCheckoutSession: mockCreateCheckoutSession,
    createBillingPortalSession: mockCreateBillingPortalSession,
    cancelSubscription: mockCancelSubscription,
    resumeSubscription: mockResumeSubscription,
    updateSeats: mockUpdateSeats,
    releaseScheduledChange: mockReleaseScheduledChange,
    changePlan: mockChangePlan,
  },
  productGateway: {
    createCheckoutSession: mockCreateProductCheckoutSession,
  },
}));

const mockCanManageBilling = vi.fn();
vi.mock("@/app/[locale]/(app)/subscription/_data/canManageBilling", () => ({
  canManageBilling: (...args: unknown[]) => mockCanManageBilling(...args),
}));

// `assertCanManageBilling` now speculatively kicks off `getUserOrgs()` in
// parallel with `listSubscriptions()` to avoid a serial round-trip on the
// team-billing path. Stub it so tests don't reach into the org gateway.
const mockGetUserOrgs = vi.fn(async () => [] as unknown[]);
vi.mock("@/app/[locale]/(app)/_data/getUserOrgs", () => ({
  getUserOrgs: () => mockGetUserOrgs(),
}));

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

let startCheckout: typeof import("@/app/actions/billing").startCheckout;
let startProductCheckout: typeof import("@/app/actions/billing").startProductCheckout;
let openBillingPortal: typeof import("@/app/actions/billing").openBillingPortal;
let cancelRenewal: typeof import("@/app/actions/billing").cancelRenewal;
let resumeSubscription: typeof import("@/app/actions/billing").resumeSubscription;
let updateSeats: typeof import("@/app/actions/billing").updateSeats;
let releaseScheduledChange: typeof import("@/app/actions/billing").releaseScheduledChange;
let changePlan: typeof import("@/app/actions/billing").changePlan;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/billing");
  startCheckout = mod.startCheckout;
  startProductCheckout = mod.startProductCheckout;
  openBillingPortal = mod.openBillingPortal;
  cancelRenewal = mod.cancelRenewal;
  resumeSubscription = mod.resumeSubscription;
  updateSeats = mod.updateSeats;
  releaseScheduledChange = mod.releaseScheduledChange;
  changePlan = mod.changePlan;
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
      formData.set("seatLimit", "5");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ planPriceId: "price_team", seatLimit: 5 }),
      );
    });

    it("forwards orgName when provided", async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_team",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("seatLimit", "3");
      formData.set("orgName", "Acme Corp");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          planPriceId: "price_team",
          seatLimit: 3,
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
      formData.set("seatLimit", "0");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      const callArgs = mockCreateCheckoutSession.mock.calls[0]![0];
      expect(callArgs.orgName).toBeUndefined();
      expect(callArgs.seatLimit).toBeUndefined();
    });

    it("returns unknown_error when gateway throws a generic error", async () => {
      mockCreateCheckoutSession.mockRejectedValue(new Error("network down"));

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      const result = await startCheckout(undefined, formData);
      expect(result).toEqual({ ok: false, code: "unknown_error" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("forwards the ApiError code and Django detail to the client", async () => {
      const { ApiError } = await import("@/domain/errors/ApiError");
      mockCreateCheckoutSession.mockRejectedValue(
        new ApiError(400, {
          detail: "Payment provider error. Please try again.",
          code: "payment_provider_error",
        }),
      );

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      const result = await startCheckout(undefined, formData);
      expect(result).toEqual({
        ok: false,
        code: "payment_provider_error",
      });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("forwards keepPersonalSubscription=true when the checkbox is checked alongside orgName", async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_team",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("seatLimit", "3");
      formData.set("orgName", "Acme Corp");
      formData.set("keepPersonalSubscription", "on");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          planPriceId: "price_team",
          seatLimit: 3,
          orgName: "Acme Corp",
          keepPersonalSubscription: true,
        }),
      );
    });

    it("forwards keepPersonalSubscription=false (default) when the checkbox is absent but orgName is provided", async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_team",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("seatLimit", "3");
      formData.set("orgName", "Acme Corp");
      // keepPersonalSubscription is intentionally not set — unchecked checkboxes
      // are absent from FormData.

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      const callArgs = mockCreateCheckoutSession.mock.calls[0]![0];
      expect(callArgs.keepPersonalSubscription).toBe(false);
      expect(callArgs.orgName).toBe("Acme Corp");
    });

    it("omits keepPersonalSubscription entirely when orgName is missing (personal-context checkout)", async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_personal",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_personal");
      // No orgName — this is a personal-context checkout. The keep-personal
      // flag is team-context only and must NOT leak through.
      formData.set("keepPersonalSubscription", "on");

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      const callArgs = mockCreateCheckoutSession.mock.calls[0]![0];
      expect(callArgs.orgName).toBeUndefined();
      expect("keepPersonalSubscription" in callArgs).toBe(false);
    });

    it("treats checkbox values other than 'on' as unchecked (false)", async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_team",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("orgName", "Acme Corp");
      formData.set("keepPersonalSubscription", "true"); // not "on"

      await expect(startCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      const callArgs = mockCreateCheckoutSession.mock.calls[0]![0];
      expect(callArgs.keepPersonalSubscription).toBe(false);
    });
  });

  describe("startProductCheckout", () => {
    it("redirects to the Stripe URL with productPriceId forwarded to productGateway", async () => {
      mockCreateProductCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/product_123",
      });

      const formData = new FormData();
      formData.set("productPriceId", "price_credits_200");

      await expect(startProductCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockCreateProductCheckoutSession).toHaveBeenCalledWith({
        productPriceId: "price_credits_200",
        successUrl: `${APP_URL}/subscription?status=success`,
        cancelUrl: `${APP_URL}/subscription`,
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "https://checkout.stripe.com/product_123",
      );
      // Must not route product purchases through the plan-checkout endpoint.
      expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
    });

    it("returns invalid_input when productPriceId is missing", async () => {
      const formData = new FormData();

      const result = await startProductCheckout(undefined, formData);
      expect(result).toEqual({ ok: false, code: "invalid_input" });
      expect(mockCreateProductCheckoutSession).not.toHaveBeenCalled();
    });

    it("returns an envelope error and does not redirect when the gateway throws", async () => {
      mockCreateProductCheckoutSession.mockRejectedValue(
        new Error("API 500: Server Error"),
      );

      const formData = new FormData();
      formData.set("productPriceId", "price_credits_200");

      const result = await startProductCheckout(undefined, formData);
      expect(result).toEqual({ ok: false, code: "unknown_error" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("forwards a valid context to the gateway when one is supplied (rule 5b)", async () => {
      mockCreateProductCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/product_team",
      });

      const formData = new FormData();
      formData.set("productPriceId", "price_credits_200");
      formData.set("context", "team");

      await expect(startProductCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockCreateProductCheckoutSession).toHaveBeenCalledWith({
        productPriceId: "price_credits_200",
        successUrl: `${APP_URL}/subscription?status=success`,
        cancelUrl: `${APP_URL}/subscription`,
        context: "team",
      });
    });

    it("drops a tampered context value rather than forwarding it", async () => {
      // RPC payload is untrusted: anything outside the literal whitelist must
      // be filtered before reaching the gateway, so a malicious caller can't
      // inject extra params or path characters via ?context=.
      mockCreateProductCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/product_default",
      });

      const formData = new FormData();
      formData.set("productPriceId", "price_credits_200");
      formData.set("context", "../admin");

      await expect(startProductCheckout(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      const call = mockCreateProductCheckoutSession.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call).not.toHaveProperty("context");
    });
  });

  describe("openBillingPortal", () => {
    const portalUser = { id: "u1" };
    const portalSubscription = { id: "s1", plan: { context: "personal" } };

    beforeEach(() => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(portalUser.id);
      mockListSubscriptions.mockResolvedValue([portalSubscription]);
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
      mockCreateBillingPortalSession.mockRejectedValue(
        new Error("portal down"),
      );
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await openBillingPortal();
      expect(result).toBeUndefined();
      expect(mockRedirect).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("forwards a form-supplied context to the gateway", async () => {
      // Concurrent personal+team billers (rule 5) MUST pin which Stripe
      // customer the portal attaches to — the BillingPortalButton plumbs
      // `context` as a hidden form field so the action can forward it.
      mockListSubscriptions.mockResolvedValueOnce([
        { id: "s1", plan: { context: "personal" } },
        { id: "s2", plan: { context: "team" } },
      ]);
      mockCreateBillingPortalSession.mockResolvedValue({
        url: "https://billing.stripe.com/portal_team",
      });
      const formData = new FormData();
      formData.set("context", "team");

      await expect(openBillingPortal(formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );

      expect(mockCreateBillingPortalSession).toHaveBeenCalledWith({
        returnUrl: `${APP_URL}/subscription`,
        context: "team",
      });
    });

    it("never forwards flow or planPriceId — portal is now vanilla manage-billing only", async () => {
      // Backend removed deep-link plan-switch support; the portal is reduced
      // to payment method / invoices / cancel. `openBillingPortal` must drop
      // any `flow` or `planPriceId` form fields a caller might still send.
      mockCreateBillingPortalSession.mockResolvedValue({
        url: "https://billing.stripe.com/portal_default",
      });
      const formData = new FormData();
      formData.set("flow", "subscription_update_confirm");
      formData.set("planPriceId", "price_pro_monthly");

      await expect(openBillingPortal(formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );

      const call = mockCreateBillingPortalSession.mock.calls[0]?.[0];
      expect(call).not.toHaveProperty("flow");
      expect(call).not.toHaveProperty("planPriceId");
    });

    it("drops a tampered context value and falls back to the backend default", async () => {
      // Server actions are reachable as RPCs — `parseContext` filters to the
      // literal union, so a hostile caller can't inject extra params or
      // path characters via the context field.
      mockCreateBillingPortalSession.mockResolvedValue({
        url: "https://billing.stripe.com/portal_default",
      });
      const formData = new FormData();
      formData.set("context", "../admin");

      await expect(openBillingPortal(formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );

      const call = mockCreateBillingPortalSession.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call).not.toHaveProperty("context");
    });
  });

  describe("cancelRenewal", () => {
    const user = { id: "u1" };
    const subscription = { id: "s1", plan: { context: "personal" } };

    it("cancels the subscription and revalidates when allowed", async () => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(true);
      mockCancelSubscription.mockResolvedValue(undefined);

      const result = await cancelRenewal();

      expect(mockCancelSubscription).toHaveBeenCalledOnce();
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/subscription",
        "layout",
      );
      expect(result.ok).toBe(true);
    });

    it("returns not_billing_member when caller cannot manage billing", async () => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(false);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cancelRenewal();

      expect(result).toEqual({ ok: false, code: "not_billing_member" });
      expect(mockCancelSubscription).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("returns no_subscription when there is no active subscription", async () => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([]);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cancelRenewal();

      expect(result).toEqual({ ok: false, code: "no_subscription" });
      expect(mockCancelSubscription).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("forwards context=personal to the gateway and selects the personal sub when concurrent", async () => {
      const personalSub = { id: "sub_p", plan: { context: "personal" } };
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([teamSub, personalSub]);
      mockCanManageBilling.mockResolvedValue(true);
      mockCancelSubscription.mockResolvedValue(undefined);

      const result = await cancelRenewal("personal");

      // Authorization check ran against the personal sub, not the team one.
      expect(mockCanManageBilling).toHaveBeenCalledWith(user.id, personalSub);
      expect(mockCancelSubscription).toHaveBeenCalledWith("personal");
      expect(result.ok).toBe(true);
    });

    it("forwards context=team to the gateway and selects the team sub when concurrent", async () => {
      const personalSub = { id: "sub_p", plan: { context: "personal" } };
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);
      mockCanManageBilling.mockResolvedValue(true);
      mockCancelSubscription.mockResolvedValue(undefined);

      await cancelRenewal("team");

      // Team-context calls pass a `{ preloadedOrgs }` options arg so
      // canManageBilling can skip the redundant getUserOrgs round-trip.
      expect(mockCanManageBilling).toHaveBeenCalledWith(
        user.id,
        teamSub,
        expect.objectContaining({ preloadedOrgs: expect.any(Array) }),
      );
      expect(mockCancelSubscription).toHaveBeenCalledWith("team");
    });

    it("normalizes a tampered context arg to undefined before touching the gateway", async () => {
      // The TS signature does not survive RPC: a malicious caller could pass
      // anything. The action must drop unknown values to undefined.
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(true);
      mockCancelSubscription.mockResolvedValue(undefined);

      const result = await cancelRenewal("../admin" as unknown as "personal");

      expect(mockCancelSubscription).toHaveBeenCalledWith(undefined);
      expect(result.ok).toBe(true);
    });

    it("returns no_subscription when context targets a row that doesn't exist (e.g. only team sub but personal requested)", async () => {
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([teamSub]);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cancelRenewal("personal");

      expect(result).toEqual({ ok: false, code: "no_subscription" });
      expect(mockCancelSubscription).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("returns context_required when caller has both personal and team subs and no context is supplied", async () => {
      // Rule 5 concurrent billing — without an explicit context the
      // authorization check would operate on an arbitrary row while the
      // backend dispatches on its own default. The action must reject.
      const personalSub = { id: "sub_p", plan: { context: "personal" } };
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);
      mockCanManageBilling.mockResolvedValue(true);

      const result = await cancelRenewal();

      expect(result).toEqual({ ok: false, code: "context_required" });
      expect(mockCancelSubscription).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("returns context_required when concurrent subs and a tampered context is normalized to undefined", async () => {
      const personalSub = { id: "sub_p", plan: { context: "personal" } };
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);
      mockCanManageBilling.mockResolvedValue(true);

      const result = await cancelRenewal("../admin" as unknown as "personal");

      expect(result).toEqual({ ok: false, code: "context_required" });
      expect(mockCancelSubscription).not.toHaveBeenCalled();
    });
  });

  describe("resumeSubscription", () => {
    const user = { id: "u1" };
    const subscription = { id: "s1", plan: { context: "team" } };

    it("resumes and revalidates when user can manage billing", async () => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(true);
      mockResumeSubscription.mockResolvedValue(undefined);

      const result = await resumeSubscription();

      expect(mockResumeSubscription).toHaveBeenCalledOnce();
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/subscription",
        "layout",
      );
      expect(result.ok).toBe(true);
    });

    it("returns not_billing_member when user cannot manage billing", async () => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(false);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await resumeSubscription();

      expect(result).toEqual({ ok: false, code: "not_billing_member" });
      expect(mockResumeSubscription).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("forwards context=personal to the gateway and authorizes against the personal sub when concurrent", async () => {
      const personalSub = { id: "sub_p", plan: { context: "personal" } };
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);
      mockCanManageBilling.mockResolvedValue(true);
      mockResumeSubscription.mockResolvedValue(undefined);

      await resumeSubscription("personal");

      expect(mockCanManageBilling).toHaveBeenCalledWith(user.id, personalSub);
      expect(mockResumeSubscription).toHaveBeenCalledWith("personal");
    });

    it("normalizes a tampered context arg to undefined", async () => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(true);
      mockResumeSubscription.mockResolvedValue(undefined);

      await resumeSubscription({ evil: true } as unknown as "personal");

      expect(mockResumeSubscription).toHaveBeenCalledWith(undefined);
    });

    it("returns context_required when caller has both personal and team subs and no context is supplied", async () => {
      const personalSub = { id: "sub_p", plan: { context: "personal" } };
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);
      mockCanManageBilling.mockResolvedValue(true);

      const result = await resumeSubscription();

      expect(result).toEqual({ ok: false, code: "context_required" });
      expect(mockResumeSubscription).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("releaseScheduledChange", () => {
    const user = { id: "u1" };
    const subscription = { id: "s1", plan: { context: "personal" } };

    it("releases the scheduled change and revalidates when allowed", async () => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(true);
      mockReleaseScheduledChange.mockResolvedValue(undefined);

      const result = await releaseScheduledChange();

      expect(mockReleaseScheduledChange).toHaveBeenCalledOnce();
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/subscription",
        "layout",
      );
      expect(result.ok).toBe(true);
    });

    it("returns not_billing_member when caller cannot manage billing", async () => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(false);

      const result = await releaseScheduledChange();

      expect(result).toEqual({ ok: false, code: "not_billing_member" });
      expect(mockReleaseScheduledChange).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("returns no_subscription when there is no active subscription", async () => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([]);

      const result = await releaseScheduledChange();

      expect(result).toEqual({ ok: false, code: "no_subscription" });
      expect(mockReleaseScheduledChange).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("forwards context=personal to the gateway when supplied", async () => {
      const personalSub = { id: "sub_p", plan: { context: "personal" } };
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);
      mockCanManageBilling.mockResolvedValue(true);
      mockReleaseScheduledChange.mockResolvedValue(undefined);

      const result = await releaseScheduledChange("personal");

      expect(mockCanManageBilling).toHaveBeenCalledWith(user.id, personalSub);
      expect(mockReleaseScheduledChange).toHaveBeenCalledWith("personal");
      expect(result.ok).toBe(true);
    });

    it("maps a gateway ApiError 404 to no_subscription", async () => {
      const { ApiError } = await import("@/domain/errors/ApiError");
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(true);
      mockReleaseScheduledChange.mockRejectedValue(new ApiError(404, {}));

      const result = await releaseScheduledChange();

      expect(result).toEqual({ ok: false, code: "HTTP_404" });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("maps a gateway ApiError 403 code to not_billing_member", async () => {
      const { ApiError } = await import("@/domain/errors/ApiError");
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(true);
      mockReleaseScheduledChange.mockRejectedValue(
        new ApiError(403, { code: "not_billing_member" }),
      );

      const result = await releaseScheduledChange();

      expect(result).toEqual({ ok: false, code: "not_billing_member" });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("updateSeats", () => {
    const seatsUser = { id: "u1" };
    const teamSubscription = { id: "s1", plan: { context: "team" } };

    beforeEach(() => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(seatsUser.id);
      mockListSubscriptions.mockResolvedValue([teamSubscription]);
      mockCanManageBilling.mockResolvedValue(true);
    });

    it("updates seats and revalidates the org layout on success", async () => {
      mockUpdateSeats.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("seatLimit", "5");

      const result = await updateSeats(undefined, formData);
      expect(mockUpdateSeats).toHaveBeenCalledWith(5, undefined);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org", "layout");
      expect(result.ok).toBe(true);
    });

    it("forwards context=team to the gateway when the form supplies it (concurrent-billing case)", async () => {
      mockUpdateSeats.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("seatLimit", "5");
      formData.set("context", "team");

      const result = await updateSeats(undefined, formData);
      expect(mockUpdateSeats).toHaveBeenCalledWith(5, "team");
      expect(result.ok).toBe(true);
    });

    it("drops a tampered context form value to undefined (whitelist)", async () => {
      mockUpdateSeats.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("seatLimit", "5");
      formData.set("context", "admin");

      const result = await updateSeats(undefined, formData);
      expect(mockUpdateSeats).toHaveBeenCalledWith(5, undefined);
      expect(result.ok).toBe(true);
    });

    it("selects the team sub when concurrent and context=team is supplied (authorization runs against the right row)", async () => {
      const personalSub = { id: "sub_p", plan: { context: "personal" } };
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);
      mockUpdateSeats.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("seatLimit", "5");
      formData.set("context", "team");

      await updateSeats(undefined, formData);

      expect(mockCanManageBilling).toHaveBeenCalledWith(
        seatsUser.id,
        teamSub,
        expect.objectContaining({ preloadedOrgs: expect.any(Array) }),
      );
      expect(mockUpdateSeats).toHaveBeenCalledWith(5, "team");
    });

    it("returns invalid_seat_count when seatLimit is missing, 0, or NaN", async () => {
      // No client-side upper bound — backend (1–10000 per Stripe) is the
      // authority. Lower bound stays here because submitting 0/negative is
      // a UI bug we can short-circuit before a wasted roundtrip.
      for (const raw of ["", "0", "abc"]) {
        const fd = new FormData();
        if (raw !== "") fd.set("seatLimit", raw);
        const result = await updateSeats(undefined, fd);
        expect(result).toEqual({ ok: false, code: "invalid_seat_count" });
      }
      expect(mockUpdateSeats).not.toHaveBeenCalled();
    });

    it("returns not_billing_member when caller cannot manage billing", async () => {
      mockCanManageBilling.mockResolvedValue(false);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const fd = new FormData();
      fd.set("seatLimit", "5");

      const result = await updateSeats(undefined, fd);
      expect(result).toEqual({ ok: false, code: "not_billing_member" });
      expect(mockUpdateSeats).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("returns context_required when caller has both personal and team subs and no context form value is supplied", async () => {
      const personalSub = { id: "sub_p", plan: { context: "personal" } };
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);

      const fd = new FormData();
      fd.set("seatLimit", "5");

      const result = await updateSeats(undefined, fd);
      expect(result).toEqual({ ok: false, code: "context_required" });
      expect(mockUpdateSeats).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("returns context_required when concurrent subs and a tampered context form value is normalized to undefined", async () => {
      const personalSub = { id: "sub_p", plan: { context: "personal" } };
      const teamSub = { id: "sub_t", plan: { context: "team" } };
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);

      const fd = new FormData();
      fd.set("seatLimit", "5");
      fd.set("context", "admin");

      const result = await updateSeats(undefined, fd);
      expect(result).toEqual({ ok: false, code: "context_required" });
      expect(mockUpdateSeats).not.toHaveBeenCalled();
    });
  });

  describe("changePlan", () => {
    const user = { id: "u1" };
    const subscription = {
      id: "s1",
      plan: { context: "personal" },
      scheduledChangeAt: null,
    };

    beforeEach(() => {
      mockGetCurrentUserIdFromCookie.mockResolvedValue(user.id);
      mockListSubscriptions.mockResolvedValue([subscription]);
      mockCanManageBilling.mockResolvedValue(true);
    });

    it("returns invalid_input when planPriceId is falsy", async () => {
      const result = await changePlan("");
      expect(result).toEqual({ ok: false, code: "invalid_input" });
      expect(mockChangePlan).not.toHaveBeenCalled();
    });

    it("calls changePlan gateway with planPriceId and revalidates on success", async () => {
      mockChangePlan.mockResolvedValueOnce({
        ...subscription,
        scheduledChangeAt: null,
      });

      const result = await changePlan("price_pro_monthly");

      expect(mockChangePlan).toHaveBeenCalledWith(
        "price_pro_monthly",
        undefined,
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/subscription",
        "layout",
      );
      expect(result).toEqual({ ok: true, data: { deferred: false } });
    });

    it("returns deferred=true when the response has a scheduledChangeAt (downgrade)", async () => {
      mockChangePlan.mockResolvedValueOnce({
        ...subscription,
        scheduledChangeAt: "2024-02-01T00:00:00Z",
      });

      const result = await changePlan("price_basic_monthly");

      expect(result).toEqual({ ok: true, data: { deferred: true } });
    });

    it("forwards context=personal to assertCanManageBilling and the gateway", async () => {
      const personalSub = {
        id: "sub_p",
        plan: { context: "personal" },
        scheduledChangeAt: null,
      };
      const teamSub = {
        id: "sub_t",
        plan: { context: "team" },
        scheduledChangeAt: null,
      };
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);
      mockChangePlan.mockResolvedValueOnce(personalSub);

      const result = await changePlan("price_basic", "personal");

      expect(mockCanManageBilling).toHaveBeenCalledWith(user.id, personalSub);
      expect(mockChangePlan).toHaveBeenCalledWith("price_basic", "personal");
      expect(result.ok).toBe(true);
    });

    it("forwards context=team to the gateway", async () => {
      const personalSub = {
        id: "sub_p",
        plan: { context: "personal" },
        scheduledChangeAt: null,
      };
      const teamSub = {
        id: "sub_t",
        plan: { context: "team" },
        scheduledChangeAt: null,
      };
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);
      mockChangePlan.mockResolvedValueOnce(teamSub);

      await changePlan("price_team_pro", "team");

      expect(mockCanManageBilling).toHaveBeenCalledWith(
        user.id,
        teamSub,
        expect.objectContaining({ preloadedOrgs: expect.any(Array) }),
      );
      expect(mockChangePlan).toHaveBeenCalledWith("price_team_pro", "team");
    });

    it("normalizes a tampered context arg to undefined", async () => {
      mockChangePlan.mockResolvedValueOnce(subscription);

      await changePlan("price_pro", "../admin" as unknown as "personal");

      expect(mockChangePlan).toHaveBeenCalledWith("price_pro", undefined);
    });

    it("returns not_billing_member when caller cannot manage billing", async () => {
      mockCanManageBilling.mockResolvedValue(false);

      const result = await changePlan("price_pro_monthly");

      expect(result).toEqual({ ok: false, code: "not_billing_member" });
      expect(mockChangePlan).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("returns no_subscription when no subscription exists", async () => {
      mockListSubscriptions.mockResolvedValue([]);

      const result = await changePlan("price_pro_monthly");

      expect(result).toEqual({ ok: false, code: "no_subscription" });
      expect(mockChangePlan).not.toHaveBeenCalled();
    });

    it("returns context_required when both subs exist and no context is supplied", async () => {
      const personalSub = {
        id: "sub_p",
        plan: { context: "personal" },
        scheduledChangeAt: null,
      };
      const teamSub = {
        id: "sub_t",
        plan: { context: "team" },
        scheduledChangeAt: null,
      };
      mockListSubscriptions.mockResolvedValue([personalSub, teamSub]);

      const result = await changePlan("price_pro_monthly");

      expect(result).toEqual({ ok: false, code: "context_required" });
      expect(mockChangePlan).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("does not revalidate when the gateway throws", async () => {
      mockChangePlan.mockRejectedValueOnce(new Error("network failure"));

      const result = await changePlan("price_pro_monthly");

      expect(result).toEqual({ ok: false, code: "unknown_error" });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("maps an ApiError 409 code to the error envelope", async () => {
      const { ApiError } = await import("@/domain/errors/ApiError");
      mockChangePlan.mockRejectedValueOnce(
        new ApiError(409, { code: "already_on_plan" }),
      );

      const result = await changePlan("price_current");

      expect(result).toEqual({ ok: false, code: "already_on_plan" });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
});
