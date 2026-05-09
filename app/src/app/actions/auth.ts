"use server";

import { redirect } from "next/navigation";
import {
  apiFetch,
  publicApiFetch,
  publicApiFetchVoid,
} from "@/infrastructure/api/apiClient";
import {
  OAuthExchangeResponseSchema,
  TokenResponseSchema,
  type OAuthExchangeResponse,
  type TokenResponse,
} from "@/infrastructure/api/schemas";
import { ApiError } from "@/domain/errors/ApiError";
import { authGateway } from "@/infrastructure/registry";
import { getPlanRouting } from "@/lib/planRoutingCache";
import {
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
import { getLocale } from "@/lib/pathname";
import { validateNewPassword } from "@/lib/passwordPolicy";
import { isValidPlanSlug } from "@/lib/planSlug";
import { validateFullName } from "@/lib/validateFullName";

export type StartOAuthResult = { redirectUrl: string };

export type ExchangeOAuthResult =
  | { ok: true; next: string }
  | {
      ok: false;
      error:
        | "oauth_no_flow"
        | "oauth_error"
        | "oauth_email_unverified_collision";
    };

/**
 * Look up the plan by price id and return its routing info, or undefined when
 * the id is unknown. Treats the plan catalog — not untrusted form fields — as
 * the source of truth for whether a signup/signin flow is team-scoped. Unknown
 * price ids fall through to the personal-signup / dashboard path, which is the
 * correct behaviour for stale links (e.g. a removed plan, or a former free
 * plan from before backend v0.7.0 stopped exposing it).
 */
async function resolvePlanRouting(
  priceId: string,
): Promise<{ context: "personal" | "team" } | undefined> {
  try {
    const routing = await getPlanRouting();
    const context = routing.get(priceId);
    return context ? { context } : undefined;
  } catch (err) {
    // Swallow on a genuine outage so signup still proceeds as personal,
    // but surface the failure server-side so a misrouted team signup isn't
    // invisible to operators.
    console.error("resolvePlanRouting failed", err);
    return undefined;
  }
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
    const raw = await publicApiFetch("/auth/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    data = TokenResponseSchema.parse(raw);
  } catch (err) {
    console.error("Sign-in failed", err);
    return toActionError(err);
  }

  await setAuthCookies(data.access_token, data.refresh_token);

  const locale = await getLocale();
  const plan = formData.get("plan");
  if (isValidPlanSlug(plan)) {
    const routing = await resolvePlanRouting(plan);
    if (routing) {
      const checkoutPath =
        routing.context === "team"
          ? "/subscription/team-checkout"
          : "/subscription/checkout";
      redirect(`/${locale}${checkoutPath}?plan=${encodeURIComponent(plan)}`);
    }
  }

  redirect(`/${locale}/dashboard`);
}

export async function signUp(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const credentials = readCredentials(formData);
  if (!credentials) return fail("email_and_password_required");

  const fullName = getString(formData, "fullName");
  const nameError = validateFullName(fullName);
  if (nameError) return fail(nameError);

  const planField = formData.get("plan");
  const slug = isValidPlanSlug(planField) ? planField : undefined;
  const routing = slug ? await resolvePlanRouting(slug) : undefined;
  const paidPlan = routing ? slug : undefined;
  const isTeam = routing?.context === "team";

  try {
    const raw = await publicApiFetch("/auth/register/", {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        full_name: fullName,
      }),
    });
    // Registration returns a token envelope but we don't consume it — the
    // user must verify their email before logging in. Parse anyway to fail
    // loudly on a malformed backend response.
    TokenResponseSchema.parse(raw);
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
  const locale = await getLocale();
  redirect(`/${locale}/login?${loginParams.toString()}`);
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
  const passwordError = validateNewPassword(password, confirmPassword);
  if (passwordError) return fail(passwordError);

  let data: TokenResponse;
  try {
    const raw = await publicApiFetch("/auth/reset-password/", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    data = TokenResponseSchema.parse(raw);
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
  const passwordError = validateNewPassword(password, confirmPassword);
  if (passwordError) return fail(passwordError);

  let data: TokenResponse;
  try {
    const raw = await apiFetch("/auth/change-password/", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: password,
      }),
    });
    data = TokenResponseSchema.parse(raw);
  } catch (err) {
    console.error("Change-password failed", err);
    return toActionError(err);
  }

  await setAuthCookies(data.access_token, data.refresh_token);
  return ok();
}

export async function resendVerificationEmail(
  email: string,
): Promise<ActionResult> {
  if (typeof email !== "string" || !email.trim()) {
    return fail("email_required");
  }

  // Fire-and-forget: always return success to avoid leaking whether the email
  // exists or is already verified — same pattern as resetPassword.
  try {
    await publicApiFetchVoid("/auth/resend-verification/", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  } catch (err) {
    // Swallow errors — never reveal whether the email exists or is already verified
    console.error("Resend-verification failed", err);
  }

  return ok();
}

export async function verifyEmail(
  token: string,
): Promise<ActionResult<{ pendingPlan?: string; isTeamPlan?: boolean }>> {
  let data: TokenResponse;
  try {
    const raw = await publicApiFetch("/auth/verify-email/", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    data = TokenResponseSchema.parse(raw);
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

export async function startOAuth(
  provider: OAuthProvider,
  nextPath: string | undefined,
): Promise<StartOAuthResult> {
  if (!isOAuthProvider(provider)) {
    throw new Error("Invalid OAuth provider");
  }

  const safeNext = validateNext(nextPath, env.NEXT_PUBLIC_APP_URL);

  // Login-fixation gate: HttpOnly flag cookie, not a nonce. Accepts a
  // seconds-wide race (victim mid-flow when they click attacker's link);
  // tradeoff debated and accepted — see project_oauth_callback_redesign memory.
  await setOAuthFlowCookies(safeNext);

  return { redirectUrl: getOAuthRedirectUrl(provider) };
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
    const raw = await publicApiFetch("/auth/oauth/exchange/", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    data = OAuthExchangeResponseSchema.parse(raw);
  } catch (err) {
    console.error("OAuth exchange failed", err);
    if (
      err instanceof ApiError &&
      err.code === "oauth_email_unverified_collision"
    ) {
      return { ok: false, error: "oauth_email_unverified_collision" };
    }
    return { ok: false, error: "oauth_error" };
  }

  await setAuthCookies(data.access_token, data.refresh_token, data.expires_in);
  return { ok: true, next: validateNext(next, env.NEXT_PUBLIC_APP_URL) };
}

/**
 * Cross-provider OAuth account-linking confirmation.
 *
 * The Django callback emails the existing account a single-use token when a
 * second OAuth provider's email matches an unverified-trust scenario (e.g.
 * Microsoft without `xms_edov`). This action posts that token back to
 * `/auth/oauth/confirm-link/` and, on success, mints the same token envelope
 * `/auth/oauth/exchange/` returns. Unlike `exchangeOAuthCode`, no
 * `oauth_in_progress` cookie is required — the email click happens in a
 * different session (often a different device) — so the caller redirects to
 * the OAUTH_NEXT_FALLBACK destination on success.
 */
export async function confirmOAuthLink(
  token: string,
): Promise<ActionResult<void>> {
  if (typeof token !== "string" || !token) {
    return fail("invalid_token");
  }

  let data: OAuthExchangeResponse;
  try {
    const raw = await publicApiFetch("/auth/oauth/confirm-link/", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    data = OAuthExchangeResponseSchema.parse(raw);
  } catch (err) {
    console.error("OAuth confirm-link failed", err);
    return toActionError(err);
  }

  await setAuthCookies(data.access_token, data.refresh_token, data.expires_in);
  return ok();
}

export async function signOut(): Promise<void> {
  const locale = await getLocale();
  try {
    await authGateway.signOut();
  } catch {
    // Backend revoke failed (already-expired session, network error, 5xx):
    // the gateway's `finally` has already cleared local cookies, so we can
    // swallow and proceed straight to the login redirect.
  }
  redirect(`/${locale}/login`);
}
