"use server";

import { redirect } from "next/navigation";
import { apiFetch, publicApiFetch } from "@/infrastructure/api/apiClient";
import { PLAN_TIER_FREE } from "@/domain/models/Plan";
import { authGateway, planGateway } from "@/infrastructure/registry";
import {
  clearAuthCookies,
  consumeOAuthFlowCookies,
  consumePendingPlan,
  setAuthCookies,
  setOAuthFlowCookies,
  setPendingPlan,
} from "@/infrastructure/auth/cookies";
import { env } from "@/lib/env";
import { validateNext } from "@/lib/oauthNext";
import {
  getOAuthRedirectUrl,
  isOAuthProvider,
  type OAuthProvider,
} from "@/infrastructure/auth/oauth";
import {
  ok,
  fail,
  toActionError,
  type ActionResult,
} from "@/lib/actions/ActionResult";
import { getString } from "@/lib/actions/parseFormData";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";

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

export type StartOAuthResult = { redirectUrl: string };

export type ExchangeOAuthResult =
  | { ok: true; next: string }
  | { ok: false; error: "oauth_no_flow" | "oauth_error" };

const PLAN_SLUG_RE = /^[A-Za-z0-9_-]{1,64}$/;

function isValidPlanSlug(value: unknown): value is string {
  return typeof value === "string" && PLAN_SLUG_RE.test(value);
}

interface PlanRouting {
  context: "personal" | "team";
  isFree: boolean;
}

/**
 * Look up the plan by price id and return its routing info, or undefined when
 * the id is unknown. Treats the plan catalog — not untrusted form fields — as
 * the source of truth for whether a signup/signin flow is team-scoped and
 * whether it should route through Stripe checkout at all (free plans are
 * auto-assigned by Django at registration, so checkout would only fail with
 * a `payment_provider_error` on the $0 price).
 */
async function resolvePlanRouting(
  priceId: string,
): Promise<PlanRouting | undefined> {
  try {
    const plans = await planGateway.listPlans();
    for (const plan of plans) {
      if (plan.price?.id === priceId) {
        return {
          context: plan.context,
          isFree: plan.tier === PLAN_TIER_FREE,
        };
      }
    }
  } catch (err) {
    // Swallow on a genuine outage so signup still proceeds as personal,
    // but surface the failure server-side so a misrouted team signup isn't
    // invisible to operators.
    console.error("resolvePlanRouting failed", err);
  }
  return undefined;
}

interface Credentials {
  email: string;
  password: string;
}

function readCredentials(formData: FormData): Credentials | null {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  // Normalize the email to lowercase so signup and login send the exact
  // same value — Django only lowercases the domain in `normalize_email`
  // and then does a case-sensitive lookup on login, so any uppercase in
  // the local part would make subsequent logins fail with "invalid
  // credentials" despite the correct password.
  return email && password
    ? { email: email.trim().toLowerCase(), password }
    : null;
}

export async function signIn(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const credentials = readCredentials(formData);
  if (!credentials) return fail("email_and_password_required");

  let data: TokenResponse;
  try {
    data = await publicApiFetch<TokenResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  } catch (err) {
    console.error("Sign-in failed", err);
    return toActionError(err);
  }

  await setAuthCookies(data.access_token, data.refresh_token);

  const plan = formData.get("plan");
  if (isValidPlanSlug(plan)) {
    const routing = await resolvePlanRouting(plan);
    if (routing && !routing.isFree) {
      const checkoutPath =
        routing.context === "team"
          ? "/subscription/team-checkout"
          : "/subscription/checkout";
      redirect(`${checkoutPath}?plan=${encodeURIComponent(plan)}`);
    }
  }

  redirect("/dashboard");
}

export async function signUp(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const credentials = readCredentials(formData);
  if (!credentials) return fail("email_and_password_required");

  const fullName = getString(formData, "fullName");
  if (!fullName || fullName.length < 3 || fullName.length > 255) {
    return fail("full_name_invalid");
  }

  const planField = formData.get("plan");
  const slug = isValidPlanSlug(planField) ? planField : undefined;
  const routing = slug ? await resolvePlanRouting(slug) : undefined;
  // Free plans are auto-assigned by Django at registration — don't forward
  // them through the post-verify checkout flow, Stripe would 400 on the $0.
  const paidPlan = routing && !routing.isFree ? slug : undefined;
  const isTeam = routing?.context === "team" && !routing.isFree;
  const registerEndpoint = isTeam
    ? "/auth/register/org-owner/"
    : "/auth/register/";

  try {
    await publicApiFetch<TokenResponse>(registerEndpoint, {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        full_name: fullName,
      }),
    });
  } catch (err) {
    console.error("Sign-up failed", err);
    return toActionError(err);
  }

  if (paidPlan) {
    await setPendingPlan(paidPlan, isTeam);
  }

  // Registration returns tokens but user must verify email first.
  const loginParams = new URLSearchParams({ registered: "true" });
  if (paidPlan) {
    loginParams.set("plan", paidPlan);
  }
  if (isTeam) {
    loginParams.set("context", "team");
  }
  redirect(`/login?${loginParams.toString()}`);
}

export async function resetPassword(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const email = getString(formData, "email");
  if (!email) return fail("email_required");

  // Fire-and-forget: always return success to avoid leaking whether the email exists.
  try {
    await publicApiFetch("/auth/forgot-password/", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  } catch {
    // Swallow errors — never reveal whether the email exists
  }

  return ok();
}

export async function resetPasswordWithToken(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirmPassword");
  const token = getString(formData, "token");

  if (!token) return fail("invalid_reset_link");
  if (!password || password.length < PASSWORD_MIN_LENGTH)
    return fail("password_too_short");
  if (password !== confirmPassword) return fail("passwords_do_not_match");

  let data: TokenResponse;
  try {
    data = await publicApiFetch<TokenResponse>("/auth/reset-password/", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  } catch (err) {
    console.error("Reset-password failed", err);
    return fail("invalid_reset_link");
  }

  await setAuthCookies(data.access_token, data.refresh_token);
  return ok();
}

export async function changePassword(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const currentPassword = getString(formData, "currentPassword");
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirmPassword");

  if (!currentPassword) return fail("current_password_required");
  if (!password || password.length < PASSWORD_MIN_LENGTH)
    return fail("password_too_short");
  if (password !== confirmPassword) return fail("passwords_do_not_match");

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
    console.error("Change-password failed", err);
    return toActionError(err);
  }

  await setAuthCookies(data.access_token, data.refresh_token);
  return ok();
}

export async function verifyEmail(
  token: string,
): Promise<ActionResult<{ pendingPlan?: string; isTeamPlan?: boolean }>> {
  let data: TokenResponse;
  try {
    data = await publicApiFetch<TokenResponse>("/auth/verify-email/", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.error("Verify-email failed", err);
    return toActionError(err);
  }

  await setAuthCookies(data.access_token, data.refresh_token);
  const pending = await consumePendingPlan();
  return ok(
    pending ? { pendingPlan: pending.plan, isTeamPlan: pending.isTeam } : {},
  );
}

const APP_URL = env.NEXT_PUBLIC_APP_URL;

export async function startOAuth(
  provider: OAuthProvider,
  nextPath: string | undefined,
): Promise<StartOAuthResult> {
  if (!isOAuthProvider(provider)) {
    throw new Error("Invalid OAuth provider");
  }

  const safeNext = validateNext(nextPath, APP_URL);
  const planFromNext = new URL(safeNext, APP_URL).searchParams.get("plan");
  const routing = isValidPlanSlug(planFromNext)
    ? await resolvePlanRouting(planFromNext)
    : undefined;

  // Free plans don't go through checkout — overwrite the flow cookie so the
  // post-exchange redirect lands on /dashboard instead of a Stripe call that
  // would 400 on the $0 price.
  const effectiveNext = routing?.isFree ? "/dashboard" : safeNext;
  const isTeam = routing?.context === "team" && !routing.isFree;

  // Login-fixation gate: HttpOnly flag cookie, not a nonce. Accepts a
  // seconds-wide race (victim mid-flow when they click attacker's link);
  // tradeoff debated and accepted — see project_oauth_callback_redesign memory.
  await setOAuthFlowCookies(effectiveNext);

  return { redirectUrl: getOAuthRedirectUrl(provider, { isTeam }) };
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
  } catch (err) {
    console.error("OAuth exchange failed", err);
    return { ok: false, error: "oauth_error" };
  }

  await setAuthCookies(data.access_token, data.refresh_token, data.expires_in);
  return { ok: true, next: validateNext(next, APP_URL) };
}

export async function signOut() {
  try {
    await authGateway.signOut();
  } catch {
    // Session already expired — clear cookies and redirect anyway
    await clearAuthCookies();
  }
  redirect("/login");
}
