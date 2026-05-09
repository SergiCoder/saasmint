import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/domain/errors/ApiError";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockPublicApiFetch = vi.fn();
const mockPublicApiFetchVoid = vi.fn();
const mockApiFetch = vi.fn();
vi.mock("@/infrastructure/api/apiClient", () => ({
  publicApiFetch: (...args: unknown[]) => mockPublicApiFetch(...args),
  publicApiFetchVoid: (...args: unknown[]) => mockPublicApiFetchVoid(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const mockSetAuthCookies = vi.fn();
const mockClearAuthCookies = vi.fn();
const mockSetPendingPlan = vi.fn();
const mockConsumePendingPlan = vi.fn();
const mockSetOAuthFlowCookies = vi.fn();
const mockConsumeOAuthFlowCookies = vi.fn();
vi.mock("@/infrastructure/auth/cookies", () => ({
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  setPendingPlan: (...args: unknown[]) => mockSetPendingPlan(...args),
  consumePendingPlan: (...args: unknown[]) => mockConsumePendingPlan(...args),
  setOAuthFlowCookies: (...args: unknown[]) => mockSetOAuthFlowCookies(...args),
  consumeOAuthFlowCookies: (...args: unknown[]) =>
    mockConsumeOAuthFlowCookies(...args),
}));

const mockSignOut = vi.fn();
const mockListPlans = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  authGateway: { signOut: mockSignOut },
  planGateway: { listPlans: mockListPlans },
}));

// Default: tests run as if the request came from /en/* — actions read the
// locale via getLocale() to build locale-prefixed redirects.
vi.mock("@/lib/pathname", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
}));

let signIn: typeof import("@/app/actions/auth").signIn;
let signUp: typeof import("@/app/actions/auth").signUp;
let signOut: typeof import("@/app/actions/auth").signOut;
let resetPassword: typeof import("@/app/actions/auth").resetPassword;
let resetPasswordWithToken: typeof import("@/app/actions/auth").resetPasswordWithToken;
let changePassword: typeof import("@/app/actions/auth").changePassword;
let verifyEmail: typeof import("@/app/actions/auth").verifyEmail;
let startOAuth: typeof import("@/app/actions/auth").startOAuth;
let exchangeOAuthCode: typeof import("@/app/actions/auth").exchangeOAuthCode;
let resendVerificationEmail: typeof import("@/app/actions/auth").resendVerificationEmail;
let confirmOAuthLink: typeof import("@/app/actions/auth").confirmOAuthLink;

function mockPlans(): void {
  // Backend v0.7.0 dropped the personal-free plan row; the catalog now only
  // contains paid (basic / pro × personal / team) plans. Stale links pointing
  // at the former free price id resolve to undefined and fall through to the
  // /dashboard / personal-signup path.
  mockListPlans.mockResolvedValue([
    {
      id: "plan_pro",
      context: "personal",
      tier: 3,
      price: { id: "price_pro_monthly" },
    },
    {
      id: "plan_team_pro",
      context: "team",
      tier: 3,
      price: { id: "price_team_pro" },
    },
  ]);
}

beforeEach(async () => {
  vi.clearAllMocks();
  mockPlans();
  const mod = await import("@/app/actions/auth");
  signIn = mod.signIn;
  signUp = mod.signUp;
  signOut = mod.signOut;
  resetPassword = mod.resetPassword;
  resetPasswordWithToken = mod.resetPasswordWithToken;
  changePassword = mod.changePassword;
  verifyEmail = mod.verifyEmail;
  startOAuth = mod.startOAuth;
  exchangeOAuthCode = mod.exchangeOAuthCode;
  resendVerificationEmail = mod.resendVerificationEmail;
  confirmOAuthLink = mod.confirmOAuthLink;
});

describe("auth server actions", () => {
  describe("signIn", () => {
    it("calls Django login and redirects to /dashboard on success", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
      });

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockPublicApiFetch).toHaveBeenCalledWith("/auth/login/", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "secret123",
        }),
      });
      expect(mockSetAuthCookies).toHaveBeenCalledWith("tok_abc", "ref_abc");
      expect(mockRedirect).toHaveBeenCalledWith("/en/dashboard");
    });

    it("returns ApiError envelope with detail when login fails", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new ApiError(401, {
          detail: "Invalid credentials.",
          code: "invalid_credentials",
        }),
      );

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "wrong");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ ok: false, code: "invalid_credentials" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("returns unknown_error for non-ApiError throwables", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("API 500: Internal"));

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "wrong");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ ok: false, code: "unknown_error" });
    });

    it("redirects to billing checkout when plan is supplied", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
      });

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");
      formData.set("plan", "price_pro_monthly");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        "/en/subscription/checkout?plan=price_pro_monthly",
      );
    });

    it("redirects to /dashboard when the plan slug is unknown to the catalog", async () => {
      // Stale links (e.g. the pre-v0.7.0 personal-free price id) resolve to
      // undefined and should land on the dashboard rather than a Stripe call
      // that would 400 on a missing price.
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
      });

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");
      formData.set("plan", "price_unknown");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockRedirect).toHaveBeenCalledWith("/en/dashboard");
    });

    it("redirects to /dashboard and logs when planGateway.listPlans throws during plan resolution", async () => {
      // resolvePlanRouting swallows catalog outages so sign-in still succeeds
      // as a personal flow, but logs the failure server-side.
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
      });
      mockListPlans.mockRejectedValue(new Error("catalog unavailable"));

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");
      formData.set("plan", "price_pro_monthly");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(vi.mocked(console.error)).toHaveBeenCalledWith(
        "resolvePlanRouting failed",
        expect.any(Error),
      );
      expect(mockRedirect).toHaveBeenCalledWith("/en/dashboard");
    });

    it("redirects to team checkout when plan resolves to a team plan", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
      });

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");
      formData.set("plan", "price_team_pro");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        "/en/subscription/team-checkout?plan=price_team_pro",
      );
    });

    it("normalizes the email to lowercase and trims whitespace before calling Django", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
      });

      const formData = new FormData();
      formData.set("email", "  User@Example.COM  ");
      formData.set("password", "secret123");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockPublicApiFetch).toHaveBeenCalledWith("/auth/login/", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "secret123",
        }),
      });
    });

    it("uses the active locale from getLocale() in the post-login redirect", async () => {
      // The redirect must honour the locale currently active in the request
      // (read from the x-pathname header via getLocale). A French-locale user
      // should land on /fr/dashboard, not the default /en/dashboard.
      const { getLocale } = await import("@/lib/pathname");
      vi.mocked(getLocale).mockResolvedValueOnce("fr");
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
      });

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockRedirect).toHaveBeenCalledWith("/fr/dashboard");
    });
  });

  describe("signUp", () => {
    it("calls Django register and redirects to /login on success", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");

      await expect(signUp(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockPublicApiFetch).toHaveBeenCalledWith("/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "secret123",
          full_name: "Jane Doe",
        }),
      });
      expect(mockRedirect).toHaveBeenCalledWith("/en/login?registered=true");
    });

    it("returns ApiError envelope with detail when registration fails", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new ApiError(400, { detail: "Email already in use." }),
      );

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "existing@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({ ok: false, code: "HTTP_400" });
    });

    it("returns unknown_error on non-ApiError throwables", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("API 500: Internal"));

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "existing@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({ ok: false, code: "unknown_error" });
    });

    it("does not carry an unknown plan slug through the verify-email flow", async () => {
      // Stale slug (e.g. the pre-v0.7.0 personal-free price id) is not in the
      // catalog — registration proceeds as personal and no pending-plan cookie
      // is set, so verify-email won't try to redirect into a Stripe call.
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");
      formData.set("plan", "price_unknown");

      await expect(signUp(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockSetPendingPlan).not.toHaveBeenCalled();
      expect(mockPublicApiFetch).toHaveBeenCalledWith(
        "/auth/register/",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockRedirect).toHaveBeenCalledWith("/en/login?registered=true");
    });

    it("uses /auth/register/ for team plans and remembers the team checkout context", async () => {
      // Backend dropped /auth/register/org-owner/ — registration is unified
      // and the org is created later when the team checkout webhook fires.
      // Frontend still tracks isTeam locally so verify-email redirects into
      // /subscription/team-checkout instead of /subscription/checkout.
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");
      formData.set("plan", "price_team_pro");

      await expect(signUp(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockPublicApiFetch).toHaveBeenCalledWith(
        "/auth/register/",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockSetPendingPlan).toHaveBeenCalledWith("price_team_pro", true);
      expect(mockRedirect).toHaveBeenCalledWith(
        "/en/login?registered=true&plan=price_team_pro&context=team",
      );
    });

    it("normalizes the email to lowercase and trims whitespace before calling Django", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "  New.User@Example.COM  ");
      formData.set("password", "secret123");

      await expect(signUp(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockPublicApiFetch).toHaveBeenCalledWith("/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          email: "new.user@example.com",
          password: "secret123",
          full_name: "Jane Doe",
        }),
      });
    });

    it("returns full_name_invalid for short or missing fullName", async () => {
      for (const name of [undefined, "Ab"]) {
        const formData = new FormData();
        if (name !== undefined) formData.set("fullName", name);
        formData.set("email", "new@example.com");
        formData.set("password", "secret123");
        const result = await signUp(undefined, formData);
        expect(result).toEqual({ ok: false, code: "full_name_invalid" });
      }
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });
  });

  describe("signIn — validation", () => {
    it("returns email_and_password_required when fields are missing", async () => {
      const cases: [string, string][][] = [
        [],
        [["email", "user@example.com"]],
        [["password", "secret123"]],
      ];
      for (const pairs of cases) {
        const formData = new FormData();
        for (const [k, v] of pairs) formData.set(k, v);
        const result = await signIn(undefined, formData);
        expect(result).toEqual({
          ok: false,
          code: "email_and_password_required",
        });
      }
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("returns ok when reset email is sent", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await resetPassword(undefined, formData);
      expect(result).toEqual({ ok: true });
      expect(mockPublicApiFetch).toHaveBeenCalledWith(
        "/auth/forgot-password/",
        {
          method: "POST",
          body: JSON.stringify({ email: "user@example.com" }),
        },
      );
    });

    it("returns email_required when email is missing", async () => {
      const formData = new FormData();

      const result = await resetPassword(undefined, formData);
      expect(result).toEqual({ ok: false, code: "email_required" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns ok even on API failure to avoid email enumeration", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new Error("API 429: Rate limit exceeded"),
      );

      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await resetPassword(undefined, formData);
      expect(result).toEqual({ ok: true });
    });
  });

  describe("resetPasswordWithToken", () => {
    it("returns ok when password is updated", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "newpassword123");
      formData.set("token", "reset-token-123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({ ok: true });
    });

    it("returns invalid_reset_link when token is missing", async () => {
      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "newpassword123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({ ok: false, code: "invalid_reset_link" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns password_too_short when password is short or missing", async () => {
      for (const [field, val] of [
        ["password", "short"],
        [null, null],
      ] as const) {
        const formData = new FormData();
        if (field === "password") formData.set(field, val!);
        formData.set("confirmPassword", val ?? "");
        formData.set("token", "reset-token-123");
        const result = await resetPasswordWithToken(undefined, formData);
        expect(result).toEqual({ ok: false, code: "password_too_short" });
      }
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns passwords_do_not_match when confirm differs", async () => {
      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "differentpassword");
      formData.set("token", "reset-token-123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({ ok: false, code: "passwords_do_not_match" });
    });

    it("returns invalid_reset_link on API failure", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("API 400"));

      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "newpassword123");
      formData.set("token", "expired-token");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({ ok: false, code: "invalid_reset_link" });
    });
  });

  describe("changePassword", () => {
    it("changes password and sets new auth cookies on success", async () => {
      mockApiFetch.mockResolvedValue({
        access_token: "new_tok",
        refresh_token: "new_ref",
      });

      const formData = new FormData();
      formData.set("currentPassword", "oldpass123");
      formData.set("password", "newpass123");
      formData.set("confirmPassword", "newpass123");

      const result = await changePassword(undefined, formData);
      expect(mockApiFetch).toHaveBeenCalledWith("/auth/change-password/", {
        method: "POST",
        body: JSON.stringify({
          current_password: "oldpass123",
          new_password: "newpass123",
        }),
      });
      expect(mockSetAuthCookies).toHaveBeenCalledWith("new_tok", "new_ref");
      expect(result).toEqual({ ok: true });
    });

    it("returns current_password_required when current password is missing", async () => {
      const formData = new FormData();
      formData.set("password", "newpass123");
      formData.set("confirmPassword", "newpass123");

      const result = await changePassword(undefined, formData);
      expect(result).toEqual({ ok: false, code: "current_password_required" });
    });

    it("returns password_too_short when new password is short", async () => {
      const formData = new FormData();
      formData.set("currentPassword", "oldpass123");
      formData.set("password", "short");
      formData.set("confirmPassword", "short");

      const result = await changePassword(undefined, formData);
      expect(result).toEqual({ ok: false, code: "password_too_short" });
    });

    it("returns passwords_do_not_match when confirm differs", async () => {
      const formData = new FormData();
      formData.set("currentPassword", "oldpass123");
      formData.set("password", "newpass123");
      formData.set("confirmPassword", "differentpass");

      const result = await changePassword(undefined, formData);
      expect(result).toEqual({ ok: false, code: "passwords_do_not_match" });
    });

    it("returns ApiError envelope with detail when change fails", async () => {
      mockApiFetch.mockRejectedValue(
        new ApiError(400, { detail: "Current password is incorrect." }),
      );

      const formData = new FormData();
      formData.set("currentPassword", "wrongpass");
      formData.set("password", "newpass123");
      formData.set("confirmPassword", "newpass123");

      const result = await changePassword(undefined, formData);
      expect(result).toEqual({ ok: false, code: "HTTP_400" });
    });

    it("returns unknown_error on non-ApiError throwables", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Internal"));

      const formData = new FormData();
      formData.set("currentPassword", "oldpass123");
      formData.set("password", "newpass123");
      formData.set("confirmPassword", "newpass123");

      const result = await changePassword(undefined, formData);
      expect(result).toEqual({ ok: false, code: "unknown_error" });
    });
  });

  describe("verifyEmail", () => {
    it("verifies email, sets cookies, and returns ok on success", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_verified",
        refresh_token: "ref_verified",
      });
      mockConsumePendingPlan.mockResolvedValue(undefined);

      const result = await verifyEmail("verify-token-123");
      expect(mockPublicApiFetch).toHaveBeenCalledWith("/auth/verify-email/", {
        method: "POST",
        body: JSON.stringify({ token: "verify-token-123" }),
      });
      expect(mockSetAuthCookies).toHaveBeenCalledWith(
        "tok_verified",
        "ref_verified",
      );
      expect(result).toEqual({ ok: true, data: {} });
    });

    it("returns pendingPlan when a plan cookie was set during signup", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_verified",
        refresh_token: "ref_verified",
      });
      mockConsumePendingPlan.mockResolvedValue({
        plan: "price_team_pro",
        isTeam: false,
      });

      const result = await verifyEmail("verify-token-123");
      expect(result).toEqual({
        ok: true,
        data: { pendingPlan: "price_team_pro", isTeamPlan: false },
      });
      expect(mockConsumePendingPlan).toHaveBeenCalledOnce();
    });

    it("returns isTeamPlan=true when team plan cookie was set during signup", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_verified",
        refresh_token: "ref_verified",
      });
      mockConsumePendingPlan.mockResolvedValue({
        plan: "price_team_pro",
        isTeam: true,
      });

      const result = await verifyEmail("verify-token-123");
      expect(result).toEqual({
        ok: true,
        data: { pendingPlan: "price_team_pro", isTeamPlan: true },
      });
    });

    it("returns ApiError envelope with detail when verification fails", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new ApiError(400, { detail: "Token has expired." }),
      );

      const result = await verifyEmail("expired-token");
      expect(result).toEqual({ ok: false, code: "HTTP_400" });
    });

    it("returns unknown_error on non-ApiError throwables", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("API 500: Internal"));

      const result = await verifyEmail("some-token");
      expect(result).toEqual({ ok: false, code: "unknown_error" });
    });
  });

  describe("signOut", () => {
    it("calls authGateway.signOut and redirects to /login", async () => {
      mockSignOut.mockResolvedValue(undefined);

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockSignOut).toHaveBeenCalledOnce();
      expect(mockRedirect).toHaveBeenCalledWith("/en/login");
    });

    it("clears cookies and redirects when gateway throws", async () => {
      mockSignOut.mockRejectedValue(new Error("Session expired"));

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockClearAuthCookies).toHaveBeenCalledOnce();
      expect(mockRedirect).toHaveBeenCalledWith("/en/login");
    });

    it("redirects to the active locale's /login when the request locale is not the default", async () => {
      // getLocale() reads the locale from the x-pathname header forwarded by
      // middleware. When the user is on /es/settings and signs out, the redirect
      // must land on /es/login rather than the default /en/login.
      const { getLocale } = await import("@/lib/pathname");
      vi.mocked(getLocale).mockResolvedValueOnce("es");
      mockSignOut.mockResolvedValue(undefined);

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/es/login");
    });
  });

  describe("startOAuth", () => {
    it("writes validated next to flow cookies and returns Django authorize URL", async () => {
      const result = await startOAuth("google", "/dashboard");

      expect(mockSetOAuthFlowCookies).toHaveBeenCalledWith("/dashboard");
      expect(result.redirectUrl).toMatch(/\/api\/v1\/auth\/oauth\/google\/$/);
    });

    it("never appends account_type, even for a team plan in next", async () => {
      // Backend OAuth handler ignores account_type — frontend stops sending
      // it. The team-checkout next is still preserved so the post-callback
      // redirect lands on /subscription/team-checkout.
      const result = await startOAuth(
        "github",
        "/en/subscription/team-checkout?plan=price_team_pro",
      );

      expect(mockSetOAuthFlowCookies).toHaveBeenCalledWith(
        "/en/subscription/team-checkout?plan=price_team_pro",
      );
      expect(new URL(result.redirectUrl).search).toBe("");
    });

    it("preserves next when plan in next is unknown to the catalog", async () => {
      // Backend v0.7.0 dropped the personal-free row; a stale link with the
      // former free price id resolves to undefined. The next is preserved
      // as-is so the eventual checkout page can redirect the user back to
      // /subscription cleanly.
      const result = await startOAuth(
        "google",
        "/subscription/checkout?plan=price_unknown",
      );

      expect(mockSetOAuthFlowCookies).toHaveBeenCalledWith(
        "/subscription/checkout?plan=price_unknown",
      );
      expect(new URL(result.redirectUrl).search).toBe("");
    });

    it("writes fallback /dashboard when next is untrusted", async () => {
      await startOAuth("google", "https://evil.com");
      expect(mockSetOAuthFlowCookies).toHaveBeenCalledWith("/dashboard");
    });

    it("writes fallback /dashboard when next is a non-allowlisted path", async () => {
      await startOAuth("google", "/admin/users");
      expect(mockSetOAuthFlowCookies).toHaveBeenCalledWith("/dashboard");
    });

    it("rejects unknown providers", async () => {
      await expect(
        startOAuth("linkedin" as never, "/dashboard"),
      ).rejects.toThrow("Invalid OAuth provider");
      expect(mockSetOAuthFlowCookies).not.toHaveBeenCalled();
    });
  });

  describe("exchangeOAuthCode", () => {
    it("returns oauth_no_flow when code is empty", async () => {
      const result = await exchangeOAuthCode("");
      expect(result).toEqual({ ok: false, error: "oauth_no_flow" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns oauth_no_flow when gate cookie is missing", async () => {
      mockConsumeOAuthFlowCookies.mockResolvedValue({
        inProgress: false,
        next: undefined,
      });

      const result = await exchangeOAuthCode("code_abc");
      expect(result).toEqual({ ok: false, error: "oauth_no_flow" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("exchanges code and sets cookies with expires_in on success", async () => {
      mockConsumeOAuthFlowCookies.mockResolvedValue({
        inProgress: true,
        next: "/dashboard",
      });
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_oauth",
        refresh_token: "ref_oauth",
        expires_in: 900,
      });

      const result = await exchangeOAuthCode("code_abc");

      expect(mockPublicApiFetch).toHaveBeenCalledWith("/auth/oauth/exchange/", {
        method: "POST",
        body: JSON.stringify({ code: "code_abc" }),
      });
      expect(mockSetAuthCookies).toHaveBeenCalledWith(
        "tok_oauth",
        "ref_oauth",
        900,
      );
      expect(result).toEqual({ ok: true, next: "/dashboard" });
    });

    it("returns oauth_error when exchange fails", async () => {
      mockConsumeOAuthFlowCookies.mockResolvedValue({
        inProgress: true,
        next: "/dashboard",
      });
      mockPublicApiFetch.mockRejectedValue(new Error("API 401: bad code"));

      const result = await exchangeOAuthCode("code_abc");
      expect(result).toEqual({ ok: false, error: "oauth_error" });
      expect(mockSetAuthCookies).not.toHaveBeenCalled();
    });

    it("returns oauth_email_unverified_collision when backend rejects with that code", async () => {
      const { ApiError } = await import("@/domain/errors/ApiError");
      mockConsumeOAuthFlowCookies.mockResolvedValue({
        inProgress: true,
        next: "/dashboard",
      });
      mockPublicApiFetch.mockRejectedValue(
        new ApiError(409, { code: "oauth_email_unverified_collision" }),
      );

      const result = await exchangeOAuthCode("code_abc");
      expect(result).toEqual({
        ok: false,
        error: "oauth_email_unverified_collision",
      });
      expect(mockSetAuthCookies).not.toHaveBeenCalled();
    });

    // Defense in depth for the open-redirect class of attacks: even though

    // the attacker would already need to control the flow cookie, the
    // `next` we return gets fed straight into a client-side router.replace
    // by AuthCallbackClient, so any payload that slipped past cookie
    // validation would redirect the signed-in user off-origin. These
    // assertions pin the fall-through to the safe default.
    it.each([
      ["absolute off-origin URL", "https://evil.com"],
      ["protocol-relative URL", "//evil.com"],
      ["backslash-injection URL", "/\\evil.com"],
      ["javascript: URI", "javascript:alert(1)"],
      ["non-allowlisted internal path", "/admin/users"],
    ])(
      "re-validates cookie-stored next at read time and falls back to /dashboard for %s",
      async (_label, storedNext) => {
        mockConsumeOAuthFlowCookies.mockResolvedValue({
          inProgress: true,
          next: storedNext,
        });
        mockPublicApiFetch.mockResolvedValue({
          access_token: "tok_oauth",
          refresh_token: "ref_oauth",
          expires_in: 900,
        });

        const result = await exchangeOAuthCode("code_abc");
        expect(result).toEqual({ ok: true, next: "/dashboard" });
      },
    );
  });

  describe("resendVerificationEmail", () => {
    it("posts to /auth/resend-verification/ with normalized email and returns ok", async () => {
      mockPublicApiFetchVoid.mockResolvedValue(undefined);

      const result = await resendVerificationEmail("User@Example.COM");
      expect(result).toEqual({ ok: true });
      expect(mockPublicApiFetchVoid).toHaveBeenCalledWith(
        "/auth/resend-verification/",
        {
          method: "POST",
          body: JSON.stringify({ email: "user@example.com" }),
        },
      );
    });

    it("trims whitespace and lowercases the email before sending", async () => {
      mockPublicApiFetchVoid.mockResolvedValue(undefined);

      await resendVerificationEmail("  Alice@Example.COM  ");
      expect(mockPublicApiFetchVoid).toHaveBeenCalledWith(
        "/auth/resend-verification/",
        expect.objectContaining({
          body: JSON.stringify({ email: "alice@example.com" }),
        }),
      );
    });

    it("returns email_required when the email is an empty string", async () => {
      const result = await resendVerificationEmail("");
      expect(result).toEqual({ ok: false, code: "email_required" });
      expect(mockPublicApiFetchVoid).not.toHaveBeenCalled();
    });

    it("returns email_required when the email is only whitespace", async () => {
      const result = await resendVerificationEmail("   ");
      expect(result).toEqual({ ok: false, code: "email_required" });
      expect(mockPublicApiFetchVoid).not.toHaveBeenCalled();
    });

    it("swallows API errors and still returns ok (fire-and-forget — avoids leaking email existence)", async () => {
      // Same semantics as resetPassword: never reveal whether the email
      // exists or is already verified, so the action always succeeds
      // from the caller's perspective even when the backend rejects.
      mockPublicApiFetchVoid.mockRejectedValue(
        new ApiError(429, {
          detail: "Too many requests.",
          code: "rate_limited",
        }),
      );

      const result = await resendVerificationEmail("user@example.com");
      expect(result).toEqual({ ok: true });
      expect(vi.mocked(console.error)).toHaveBeenCalledWith(
        "Resend-verification failed",
        expect.any(ApiError),
      );
    });

    it("swallows non-ApiError throwables and still returns ok", async () => {
      mockPublicApiFetchVoid.mockRejectedValue(new Error("network down"));

      const result = await resendVerificationEmail("user@example.com");
      expect(result).toEqual({ ok: true });
      expect(vi.mocked(console.error)).toHaveBeenCalledWith(
        "Resend-verification failed",
        expect.any(Error),
      );
    });
  });

  describe("confirmOAuthLink", () => {
    it("posts to /auth/oauth/confirm-link/, sets cookies with expires_in, returns ok", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_link",
        refresh_token: "ref_link",
        token_type: "Bearer",
        expires_in: 900,
      });

      const result = await confirmOAuthLink("link-token-abc");
      expect(mockPublicApiFetch).toHaveBeenCalledWith(
        "/auth/oauth/confirm-link/",
        {
          method: "POST",
          body: JSON.stringify({ token: "link-token-abc" }),
        },
      );
      expect(mockSetAuthCookies).toHaveBeenCalledWith(
        "tok_link",
        "ref_link",
        900,
      );
      expect(result).toEqual({ ok: true });
    });

    it("returns invalid_token when token is empty without calling the API", async () => {
      const result = await confirmOAuthLink("");
      expect(result).toEqual({ ok: false, code: "invalid_token" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
      expect(mockSetAuthCookies).not.toHaveBeenCalled();
    });

    it.each([
      ["token_used", 401],
      ["token_expired", 401],
      ["invalid_token", 401],
      ["user_not_found", 403],
      ["social_account_collision", 409],
    ])(
      "maps backend code %s (HTTP %i) into the action envelope without setting cookies",
      async (code, status) => {
        mockPublicApiFetch.mockRejectedValue(
          new ApiError(status, { detail: "nope", code }),
        );

        const result = await confirmOAuthLink("link-token-abc");
        expect(result).toEqual({ ok: false, code });
        expect(mockSetAuthCookies).not.toHaveBeenCalled();
        expect(vi.mocked(console.error)).toHaveBeenCalledWith(
          "OAuth confirm-link failed",
          expect.any(ApiError),
        );
      },
    );

    it("returns unknown_error on non-ApiError throwables", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("network down"));

      const result = await confirmOAuthLink("link-token-abc");
      expect(result).toEqual({ ok: false, code: "unknown_error" });
      expect(mockSetAuthCookies).not.toHaveBeenCalled();
    });
  });
});
