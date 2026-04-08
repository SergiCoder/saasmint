"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/server";
import { SignOut } from "@/application/use-cases/auth/SignOut";
import { authGateway } from "@/infrastructure/registry";
import { APP_ORIGIN } from "@/app/[locale]/(app)/subscription/_data/trustedRedirect";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result);

  if (error) {
    return { error: error.message };
  }

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

  const plan = formData.get("plan");
  const callbackUrl = new URL(`${APP_ORIGIN}/auth/callback`);
  if (typeof plan === "string" && plan) {
    callbackUrl.searchParams.set(
      "next",
      `/subscription/checkout?plan=${encodeURIComponent(plan)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...result,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?registered=true");
}

export async function resetPassword(_prevState: unknown, formData: FormData) {
  const email = formData.get("email");

  if (typeof email !== "string") {
    return { error: "Email is required" };
  }

  const supabase = await createClient();
  // Fire-and-forget: always return success to avoid leaking whether the email exists.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_ORIGIN}/auth/callback?next=/reset-password`,
  });

  return { success: true };
}

export async function updatePassword(_prevState: unknown, formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signOut() {
  await new SignOut(authGateway).execute();
  redirect("/login");
}
