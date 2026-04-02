"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/server";
import { SignOut } from "@/application/use-cases/auth/SignOut";
import { authGateway } from "@/infrastructure/registry";

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

  const pronouns = formData.get("pronouns");

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...result,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        pronouns: typeof pronouns === "string" && pronouns ? pronouns : null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?registered=true");
}

export async function signOut() {
  await new SignOut(authGateway).execute();
  redirect("/login");
}
