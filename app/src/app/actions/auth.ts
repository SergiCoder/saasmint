"use server";

import { redirect } from "next/navigation";
import { apiFetch, publicApiFetch } from "@/infrastructure/api/apiClient";
import { SignOut } from "@/application/use-cases/auth/SignOut";
import { ListPlans } from "@/application/use-cases/billing/ListPlans";
import { authGateway, planGateway } from "@/infrastructure/registry";
import {
  clearAuthCookies,
  consumeOAuthFlowCookies,
  consumePendingPlan,
  setAuthCookies,
  setOAuthFlowCookies,
  setPendingPlan,
} from "@/infrastructure/auth/cookies";
import { friendlyError } from "@/lib/friendlyError";
import { validateNext } from "@/lib/oauthNext";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

interface OAuthExchangeResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
}

export type OAuthProvider = "google" | "github" | "microsoft";

export type StartOAuthResult = { redirectUrl: string };

export type ExchangeOAuthResult =
  | { ok: true; next: string }
  | { ok: false; error: "oauth_no_flow" | "oauth_error" };

const PLAN_SLUG_RE = /^[A-Za-z0-9_-]{1,64}$/;

function isValidPlanSlug(value: unknown): value is string {
  return typeof value === "string" && PLAN_SLUG_RE.test(value);
}

/**
 * Look up the plan by price id and return its context, or undefined when the
 * id is unknown. Treats the plan catalog — not untrusted form fields — as the
 * source of truth for whether a signup/signin flow is team-scoped.
 */
async function resolvePlanContext(
  priceId: string,
): Promise<"personal" | "team" | undefined> {
  try {
    const plans = await new ListPlans(planGateway).execute();
    for (const plan of plans) {
      if (plan.price?.id === priceId) return plan.context;
    }
  } catch {
    // fall through
  }
  return undefined;
}

function extractCredentials(
  formData: FormData,
): { email: string; password: string } | { error: string } {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required" };
  }

  return { email, password };
}

export async function signIn(_prevState: unknown, formData: FormData) {
  const result = extractCredentials(formData);
  if ("error" in result) return result;

  let data: TokenResponse;
  try {
    data = await publicApiFetch<TokenResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify(result),
    });
  } catch (err) {
    return { error: friendlyError(err, "Login failed. Please try again.") };
  }

  await setAuthCookies(data.access_token, data.refresh_token);

  const plan = formData.get("plan");
  if (isValidPlanSlug(plan)) {
    const context = await resolvePlanContext(plan);
    const checkoutPath =
      context === "team"
        ? "/subscription/team-checkout"
        : "/subscription/checkout";
    redirect(`${checkoutPath}?plan=${encodeURIComponent(plan)}`);
  }

  redirect("/dashboard");
}

export async function signUp(_prevState: unknown, formData: FormData) {
  const result = extractCredentials(formData);
  if ("error" in result) return result;

  const fullName = formData.get("fullName");
  if (
    typeof fullName !== "string" ||
    fullName.length < 3 ||
    fullName.length > 255
  ) {
    return { error: "Full name must be between 3 and 255 characters" };
  }

  const planField = formData.get("plan");
  const validPlan = isValidPlanSlug(planField) ? planField : undefined;
  const isTeam = validPlan
    ? (await resolvePlanContext(validPlan)) === "team"
    : false;
  const registerEndpoint = isTeam
    ? "/auth/register/org-owner/"
    : "/auth/register/";

  try {
    await publicApiFetch<TokenResponse>(registerEndpoint, {
      method: "POST",
      body: JSON.stringify({
        email: result.email,
        password: result.password,
        full_name: fullName,
      }),
    });
  } catch (err) {
    return {
      error: friendlyError(err, "Registration failed. Please try again."),
    };
  }

  if (validPlan) {
    await setPendingPlan(validPlan, isTeam);
  }

  // Registration returns tokens but user must verify email first.
  const loginParams = new URLSearchParams({ registered: "true" });
  if (validPlan) {
    loginParams.set("plan", validPlan);
  }
  if (isTeam) {
    loginParams.set("context", "team");
  }
  redirect(`/login?${loginParams.toString()}`);
}

export async function resetPassword(_prevState: unknown, formData: FormData) {
  const email = formData.get("email");

  if (typeof email !== "string") {
    return { error: "Email is required" };
  }

  // Fire-and-forget: always return success to avoid leaking whether the email exists.
  try {
    await publicApiFetch("/auth/forgot-password/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  } catch {
    // Swallow errors — never reveal whether the email exists
  }

  return { success: true };
}

export async function resetPasswordWithToken(
  _prevState: unknown,
  formData: FormData,
) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const token = formData.get("token");

  if (typeof token !== "string" || !token) {
    return {
      error: "Invalid or expired reset link. Please request a new one.",
    };
  }

  if (typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  let data: TokenResponse;
  try {
    data = await publicApiFetch<TokenResponse>("/auth/reset-password/", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  } catch {
    return {
      error:
        "This reset link is invalid or has expired. Please request a new one.",
    };
  }

  await setAuthCookies(data.access_token, data.refresh_token);
  return { success: true };
}

export async function changePassword(_prevState: unknown, formData: FormData) {
  const currentPassword = formData.get("currentPassword");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof currentPassword !== "string" || !currentPassword) {
    return { error: "Current password is required" };
  }

  if (typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  let data: TokenResponse;
  try {
    data = await apiFetch<TokenResponse>("/auth/change-password/", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: password,
      }),
    });
  } catch (err) {
    return {
      error: friendlyError(err, "Failed to change password. Please try again."),
    };
  }

  await setAuthCookies(data.access_token, data.refresh_token);
  return { success: true };
}

export async function verifyEmail(
  token: string,
): Promise<{ error?: string; pendingPlan?: string; isTeamPlan?: boolean }> {
  let data: TokenResponse;
  try {
    data = await publicApiFetch<TokenResponse>("/auth/verify-email/", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    return {
      error: friendlyError(err, "Verification failed. Please try again."),
    };
  }

  await setAuthCookies(data.access_token, data.refresh_token);
  const pending = await consumePendingPlan();
  return pending
    ? { pendingPlan: pending.plan, isTeamPlan: pending.isTeam }
    : {};
}

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const OAUTH_PROVIDERS: readonly OAuthProvider[] = [
  "google",
  "github",
  "microsoft",
];

export async function startOAuth(
  provider: OAuthProvider,
  nextPath: string | undefined,
): Promise<StartOAuthResult> {
  if (!OAUTH_PROVIDERS.includes(provider)) {
    throw new Error("Invalid OAuth provider");
  }

  const safeNext = validateNext(nextPath, APP_URL);
  // Login-fixation gate: HttpOnly flag cookie, not a nonce. Accepts a
  // seconds-wide race (victim mid-flow when they click attacker's link);
  // tradeoff debated and accepted — see project_oauth_callback_redesign memory.
  await setOAuthFlowCookies(safeNext);

  const planFromNext = new URL(safeNext, APP_URL).searchParams.get("plan");
  const isTeam =
    isValidPlanSlug(planFromNext) &&
    (await resolvePlanContext(planFromNext)) === "team";

  const url = new URL(`${API_URL}/api/v1/auth/oauth/${provider}/`);
  if (isTeam) {
    url.searchParams.set("account_type", "org_owner");
  }
  return { redirectUrl: url.toString() };
}

export async function exchangeOAuthCode(
  code: string,
): Promise<ExchangeOAuthResult> {
  if (typeof code !== "string" || !code) {
    return { ok: false, error: "oauth_no_flow" };
  }

  const { inProgress, next } = await consumeOAuthFlowCookies();
  if (!inProgress) {
    return { ok: false, error: "oauth_no_flow" };
  }

  let data: OAuthExchangeResponse;
  try {
    data = await publicApiFetch<OAuthExchangeResponse>(
      "/auth/oauth/exchange/",
      { method: "POST", body: JSON.stringify({ code }) },
    );
  } catch {
    return { ok: false, error: "oauth_error" };
  }

  await setAuthCookies(data.access_token, data.refresh_token, data.expires_in);
  return { ok: true, next: validateNext(next, APP_URL) };
}

export async function signOut() {
  try {
    await new SignOut(authGateway).execute();
  } catch {
    // Session already expired — clear cookies and redirect anyway
    await clearAuthCookies();
  }
  redirect("/login");
}
