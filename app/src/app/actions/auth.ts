"use server";

import { redirect } from "next/navigation";
import { apiFetch, publicApiFetch } from "@/infrastructure/api/apiClient";
import { SignOut } from "@/application/use-cases/auth/SignOut";
import { authGateway } from "@/infrastructure/registry";
import {
  clearAuthCookies,
  consumePendingPlan,
  setAuthCookies,
  setPendingPlan,
} from "@/infrastructure/auth/cookies";
import { friendlyError } from "@/lib/friendlyError";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
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
  if (typeof plan === "string" && plan) {
    const context = formData.get("context");
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

  const context = formData.get("context");
  const isTeam = context === "team";
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

  const plan = formData.get("plan");
  if (typeof plan === "string" && plan) {
    await setPendingPlan(plan, isTeam);
  }

  // Registration returns tokens but user must verify email first.
  const loginParams = new URLSearchParams({ registered: "true" });
  if (typeof plan === "string" && plan) {
    loginParams.set("plan", plan);
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

export async function signOut() {
  try {
    await new SignOut(authGateway).execute();
  } catch {
    // Session already expired — clear cookies and redirect anyway
    await clearAuthCookies();
  }
  redirect("/login");
}
