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
const mockApiFetch = vi.fn();
vi.mock("@/infrastructure/api/apiClient", () => ({
  publicApiFetch: (...args: unknown[]) => mockPublicApiFetch(...args),
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

const mockSignOutExecute = vi.fn();
vi.mock("@/application/use-cases/auth/SignOut", () => ({
  SignOut: function SignOut() {
    return { execute: mockSignOutExecute };
  },
}));

const mockListPlansExecute = vi.fn();
vi.mock("@/application/use-cases/billing/ListPlans", () => ({
  ListPlans: function ListPlans() {
    return { execute: mockListPlansExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  authGateway: {},
  planGateway: {},
}));

// Force fresh module for each test
let signIn: typeof import("@/app/actions/auth").signIn;
let signUp: typeof import("@/app/actions/auth").signUp;
let signOut: typeof import("@/app/actions/auth").signOut;
let resetPassword: typeof import("@/app/actions/auth").resetPassword;
let resetPasswordWithToken: typeof import("@/app/actions/auth").resetPasswordWithToken;
let changePassword: typeof import("@/app/actions/auth").changePassword;
let verifyEmail: typeof import("@/app/actions/auth").verifyEmail;
let startOAuth: typeof import("@/app/actions/auth").startOAuth;
let exchangeOAuthCode: typeof import("@/app/actions/auth").exchangeOAuthCode;

function mockPlans(): void {
  mockListPlansExecute.mockResolvedValue([
    {
      id: "plan_pro",
      context: "personal",
      price: { id: "price_pro_monthly" },
    },
    {
      id: "plan_team_pro",
      context: "team",
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
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("returns friendly error from API detail field", async () => {
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
      expect(result).toEqual({ error: "Invalid credentials." });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("returns fallback on non-JSON API error", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("API 500: Internal"));

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "wrong");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({
        error: "Login failed. Please try again.",
      });
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
        "/subscription/checkout?plan=price_pro_monthly",
      );
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
        "/subscription/team-checkout?plan=price_team_pro",
      );
    });

    it("ignores hidden context=team when plan resolves to a personal plan", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
      });

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");
      formData.set("plan", "price_pro_monthly");
      formData.set("context", "team");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        "/subscription/checkout?plan=price_pro_monthly",
      );
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
      expect(mockRedirect).toHaveBeenCalledWith("/login?registered=true");
    });

    it("returns friendly error from API detail field", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new ApiError(400, { detail: "Email already in use." }),
      );

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "existing@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({ error: "Email already in use." });
    });

    it("returns fallback on non-JSON API error", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("API 500: Internal"));

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "existing@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({
        error: "Registration failed. Please try again.",
      });
    });

    it("sets pending plan cookie and includes plan in login redirect", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");
      formData.set("plan", "price_pro_monthly");

      await expect(signUp(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockSetPendingPlan).toHaveBeenCalledWith(
        "price_pro_monthly",
        false,
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        "/login?registered=true&plan=price_pro_monthly",
      );
    });

    it("uses org-owner endpoint when plan resolves to a team plan", async () => {
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
        "/auth/register/org-owner/",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockSetPendingPlan).toHaveBeenCalledWith("price_team_pro", true);
      expect(mockRedirect).toHaveBeenCalledWith(
        "/login?registered=true&plan=price_team_pro&context=team",
      );
    });

    it("ignores hidden context=team when plan resolves to a personal plan", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");
      formData.set("plan", "price_pro_monthly");
      formData.set("context", "team");

      await expect(signUp(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockPublicApiFetch).toHaveBeenCalledWith(
        "/auth/register/",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockSetPendingPlan).toHaveBeenCalledWith(
        "price_pro_monthly",
        false,
      );
    });

    it("returns error when fullName is too short", async () => {
      const formData = new FormData();
      formData.set("fullName", "Ab");
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({
        error: "Full name must be between 3 and 255 characters",
      });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when fullName is missing", async () => {
      const formData = new FormData();
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({
        error: "Full name must be between 3 and 255 characters",
      });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });
  });

  describe("signIn — validation", () => {
    it("returns error when email is missing", async () => {
      const formData = new FormData();
      formData.set("password", "secret123");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Email and password are required" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when password is missing", async () => {
      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Email and password are required" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when both fields are missing", async () => {
      const formData = new FormData();

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Email and password are required" });
    });
  });

  describe("resetPassword", () => {
    it("returns success when reset email is sent", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await resetPassword(undefined, formData);
      expect(result).toEqual({ success: true });
      expect(mockPublicApiFetch).toHaveBeenCalledWith(
        "/auth/forgot-password/",
        {
          method: "POST",
          body: JSON.stringify({ email: "user@example.com" }),
        },
      );
    });

    it("returns error when email is missing", async () => {
      const formData = new FormData();

      const result = await resetPassword(undefined, formData);
      expect(result).toEqual({ error: "Email is required" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns success even on API failure to avoid email enumeration", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new Error("API 429: Rate limit exceeded"),
      );

      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await resetPassword(undefined, formData);
      expect(result).toEqual({ success: true });
    });
  });

  describe("resetPasswordWithToken", () => {
    it("returns success when password is updated", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "newpassword123");
      formData.set("token", "reset-token-123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({ success: true });
      expect(mockPublicApiFetch).toHaveBeenCalledWith("/auth/reset-password/", {
        method: "POST",
        body: JSON.stringify({
          token: "reset-token-123",
          password: "newpassword123",
        }),
      });
    });

    it("returns error when token is missing", async () => {
      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "newpassword123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({
        error: "Invalid or expired reset link. Please request a new one.",
      });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when password is too short", async () => {
      const formData = new FormData();
      formData.set("password", "short");
      formData.set("confirmPassword", "short");
      formData.set("token", "reset-token-123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({
        error: "Password must be at least 8 characters",
      });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when password is missing", async () => {
      const formData = new FormData();
      formData.set("confirmPassword", "newpassword123");
      formData.set("token", "reset-token-123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({
        error: "Password must be at least 8 characters",
      });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when passwords do not match", async () => {
      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "differentpassword");
      formData.set("token", "reset-token-123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({ error: "Passwords do not match" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error message on API failure", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new Error("API 400: Invalid or expired token"),
      );

      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "newpassword123");
      formData.set("token", "expired-token");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({
        error:
          "This reset link is invalid or has expired. Please request a new one.",
      });
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
      expect(result).toEqual({ success: true });
    });

    it("returns error when current password is missing", async () => {
      const formData = new FormData();
      formData.set("password", "newpass123");
      formData.set("confirmPassword", "newpass123");

      const result = await changePassword(undefined, formData);
      expect(result).toEqual({ error: "Current password is required" });
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when new password is too short", async () => {
      const formData = new FormData();
      formData.set("currentPassword", "oldpass123");
      formData.set("password", "short");
      formData.set("confirmPassword", "short");

      const result = await changePassword(undefined, formData);
      expect(result).toEqual({
        error: "Password must be at least 8 characters",
      });
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when passwords do not match", async () => {
      const formData = new FormData();
      formData.set("currentPassword", "oldpass123");
      formData.set("password", "newpass123");
      formData.set("confirmPassword", "differentpass");

      const result = await changePassword(undefined, formData);
      expect(result).toEqual({ error: "Passwords do not match" });
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("returns friendly error from API detail field", async () => {
      mockApiFetch.mockRejectedValue(
        new ApiError(400, { detail: "Current password is incorrect." }),
      );

      const formData = new FormData();
      formData.set("currentPassword", "wrongpass");
      formData.set("password", "newpass123");
      formData.set("confirmPassword", "newpass123");

      const result = await changePassword(undefined, formData);
      expect(result).toEqual({ error: "Current password is incorrect." });
    });

    it("returns fallback on non-JSON API error", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Internal"));

      const formData = new FormData();
      formData.set("currentPassword", "oldpass123");
      formData.set("password", "newpass123");
      formData.set("confirmPassword", "newpass123");

      const result = await changePassword(undefined, formData);
      expect(result).toEqual({
        error: "Failed to change password. Please try again.",
      });
    });
  });

  describe("verifyEmail", () => {
    it("verifies email and sets auth cookies on success", async () => {
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
      expect(result).toEqual({});
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
        pendingPlan: "price_team_pro",
        isTeamPlan: false,
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
        pendingPlan: "price_team_pro",
        isTeamPlan: true,
      });
    });

    it("returns friendly error from API detail field", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new ApiError(400, { detail: "Token has expired." }),
      );

      const result = await verifyEmail("expired-token");
      expect(result).toEqual({ error: "Token has expired." });
    });

    it("returns fallback on non-JSON API error", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("API 500: Internal"));

      const result = await verifyEmail("some-token");
      expect(result).toEqual({
        error: "Verification failed. Please try again.",
      });
    });
  });

  describe("signOut", () => {
    it("executes SignOut use case and redirects to /login", async () => {
      mockSignOutExecute.mockResolvedValue(undefined);

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockSignOutExecute).toHaveBeenCalledOnce();
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("clears cookies and redirects when SignOut throws", async () => {
      mockSignOutExecute.mockRejectedValue(new Error("Session expired"));

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockClearAuthCookies).toHaveBeenCalledOnce();
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("startOAuth", () => {
    it("writes validated next to flow cookies and returns Django authorize URL", async () => {
      const result = await startOAuth("google", "/dashboard");

      expect(mockSetOAuthFlowCookies).toHaveBeenCalledWith("/dashboard");
      expect(result.redirectUrl).toMatch(/\/api\/v1\/auth\/oauth\/google\/$/);
    });

    it("appends account_type=org_owner when plan in next resolves to a team plan", async () => {
      const result = await startOAuth(
        "github",
        "/subscription/team-checkout?plan=price_team_pro",
      );

      expect(mockSetOAuthFlowCookies).toHaveBeenCalledWith(
        "/subscription/team-checkout?plan=price_team_pro",
      );
      expect(new URL(result.redirectUrl).searchParams.get("account_type")).toBe(
        "org_owner",
      );
    });

    it("does not append account_type when plan resolves to a personal plan", async () => {
      const result = await startOAuth(
        "github",
        "/subscription/checkout?plan=price_pro_monthly",
      );

      expect(new URL(result.redirectUrl).searchParams.get("account_type")).toBe(
        null,
      );
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

    it("passes undefined expires_in when backend omits it", async () => {
      mockConsumeOAuthFlowCookies.mockResolvedValue({
        inProgress: true,
        next: "/dashboard",
      });
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_oauth",
        refresh_token: "ref_oauth",
      });

      await exchangeOAuthCode("code_abc");
      expect(mockSetAuthCookies).toHaveBeenCalledWith(
        "tok_oauth",
        "ref_oauth",
        undefined,
      );
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

    it("re-validates cookie-stored next at read time (defense in depth)", async () => {
      mockConsumeOAuthFlowCookies.mockResolvedValue({
        inProgress: true,
        next: "https://evil.com",
      });
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_oauth",
        refresh_token: "ref_oauth",
        expires_in: 900,
      });

      const result = await exchangeOAuthCode("code_abc");
      expect(result).toEqual({ ok: true, next: "/dashboard" });
    });
  });
});
