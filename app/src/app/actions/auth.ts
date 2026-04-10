"use server";

import { redirect } from "next/navigation";
import { apiFetch, publicApiFetch } from "@/infrastructure/api/apiClient";
import { SignOut } from "@/application/use-cases/auth/SignOut";
import { authGateway } from "@/infrastructure/registry";
import {
  clearAuthCookies,
  setAuthCookies,
} from "@/infrastructure/auth/cookies";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

/** Extract a human-readable message from an API error thrown by apiClient. */
function friendlyError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  // apiClient throws `Error("API <status>: <body>")` — try to parse the JSON body
  const match = err.message.match(/^API \d+: (.+)$/s);
  if (match) {
    try {
      const body = JSON.parse(match[1]) as { detail?: string };
      if (typeof body.detail === "string") return body.detail;
    } catch {
      // not JSON — fall through
    }
  }
  return fallback;
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
    redirect(`/subscription/checkout?plan=${encodeURIComponent(plan)}`);
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

  try {
    await publicApiFetch<TokenResponse>("/auth/register/", {
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

  // Registration returns tokens but user must verify email first.
  redirect("/login?registered=true");
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

export async function verifyEmail(token: string): Promise<{ error?: string }> {
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
  return {};
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
